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
 * Builds socket.io's function-form `auth`, which runs on every handshake
 * (including automatic reconnects), so a fresh short-lived token is used each time.
 * Falls back to `{}` (cookie auth via withCredentials) when no token is available.
 */
export function createSocketAuth(getToken: SocketTokenProvider) {
  return (cb: (data: SocketAuthPayload) => void) => {
    getToken()
      .then((token) => {
        cb(token && token.trim() !== "" ? { token } : {})
      })
      .catch((error: unknown) => {
        cb({})
        // The session is gone: stop instead of re-fetching on every reconnect
        if (isUnauthorizedError(error)) {
          console.warn("[SOCKET AUTH ERROR] Socket token request was unauthorized. Disconnecting.")
          socket?.disconnect()
        }
      })
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

    if (isAuthError) {
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
