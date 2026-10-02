import { io, Socket, type SocketOptions, type ManagerOptions } from "socket.io-client"
import axios from "axios"
import { isDemoMode } from "@/lib/auth/demo-mode"

let socket: Socket | null = null

let pendingResolvers: Array<(socket: Socket) => void> = []

/**
 * Derives the WebSocket/Socket.io server URL.
 * Priority:
 * 1. NEXT_PUBLIC_SOCKET_URL
 * 2. NEXT_PUBLIC_API_URL (with trailing /api stripped)
 * 3. Default fallback: http://localhost:40001
 */
export const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
  }
  return "http://localhost:40001"
}

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error("Socket not initialized. Call connectSocket() first.")
  }
  return socket
}

export const getSocketAsync = (timeoutMs = 10_000): Promise<Socket> => {
  if (socket) return Promise.resolve(socket)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResolvers = pendingResolvers.filter((r) => r !== onReady)
      reject(new Error("Socket was not initialized in time"))
    }, timeoutMs)

    const onReady = (s: Socket) => {
      clearTimeout(timeout)
      resolve(s)
    }

    pendingResolvers.push(onReady)
  })
}

/** Resolves a short-lived socket token; null/empty means "use cookies". */
export type SocketTokenProvider = () => Promise<string | null>

type SocketAuthPayload = { token?: string }

/** True when the token request itself was rejected as unauthenticated. */
function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

/**
 * Backoff between token fetch attempts: 3 attempts in total
 * (immediately, then after 300 ms, then after 900 ms).
 */
export const TOKEN_FETCH_RETRY_DELAYS_MS = [300, 900] as const

/**
 * True when the most recent token fetch exhausted its retries on transient
 * failures. While set, server auth rejections are expected (the handshake
 * went out without a token), so connect_error keeps socket.io's reconnection
 * running to retry with a fresh token instead of disconnecting for good.
 */
let lastTokenFetchFailed = false

/** @internal Test-only reset of token fetch bookkeeping. */
export function __resetSocketAuthStateForTests() {
  lastTokenFetchFailed = false
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Builds socket.io's function-form `auth`, which runs on every handshake
 * (including automatic reconnects), so a fresh short-lived token is used each time.
 *
 * - Token → `{ token }`. Null/empty (no token by design) → `{}` (cookie auth).
 * - Transient failure (network, 5xx, 429 rethrown by the provider) → retried per
 *   TOKEN_FETCH_RETRY_DELAYS_MS; if every attempt fails → `{}` and the failure
 *   is recorded so the next auth rejection does not stop reconnection.
 * - 401 → the session is gone: disconnect without calling `cb` (no handshake).
 */
export function createSocketAuth(getToken: SocketTokenProvider) {
  return (cb: (data: SocketAuthPayload) => void) => {
    void (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const token = await getToken()
          lastTokenFetchFailed = false
          cb(token && token.trim() !== "" ? { token } : {})
          return
        } catch (error: unknown) {
          if (isUnauthorizedError(error)) {
            console.warn("[SOCKET AUTH ERROR] Socket token request was unauthorized. Disconnecting.")
            socket?.disconnect()
            return
          }
          const delay = TOKEN_FETCH_RETRY_DELAYS_MS[attempt]
          if (delay === undefined) {
            lastTokenFetchFailed = true
            cb({})
            return
          }
          await wait(delay)
        }
      }
    })()
  }
}

/**
 * Initializes and connects the Socket.io client.
 *
 * Authentication Strategy:
 * - Token provider function (production): fetched on every handshake via the
 *   function form of `auth`, so reconnects never reuse an expired token.
 * - Static non-empty token string (demo mode): passed once as `{ auth: { token } }`.
 * - Nothing / empty: `auth` is omitted and the browser authenticates the
 *   handshake with HttpOnly cookies (`withCredentials: true`).
 * - In demo mode a provider is ignored so no token request is made.
 */
export const connectSocket = (auth?: SocketTokenProvider | string): Socket => {
  if (socket?.connected) return socket

  const socketUrl = getSocketUrl()

  const options: Partial<ManagerOptions & SocketOptions> = {
    withCredentials: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
  }

  if (typeof auth === "function") {
    if (!isDemoMode()) {
      options.auth = createSocketAuth(auth)
    }
  } else if (auth && auth.trim() !== "") {
    // Only pass a static auth payload if a valid non-empty token is provided
    options.auth = { token: auth }
  }

  socket = io(socketUrl, options)

  // Halt reconnection on authentication rejection to prevent infinite reconnect spam
  socket.on("connect_error", (err: Error) => {
    const message = err.message?.toLowerCase() || ""
    const isAuthError =
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("jwt") ||
      message.includes("auth")

    // A rejection after a failed token fetch is expected: let socket.io's
    // capped reconnection re-run the auth function with a fresh token.
    if (isAuthError && !lastTokenFetchFailed) {
      console.warn(
        `[SOCKET AUTH ERROR] Connection rejected by server (${err.message}). Disconnecting.`
      )
      socket?.disconnect()
    }
  })

  pendingResolvers.forEach((resolve) => resolve(socket!))
  pendingResolvers = []

  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}
