import { io, Socket, type SocketOptions, type ManagerOptions } from "socket.io-client"

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

/**
 * Initializes and connects the Socket.io client.
 *
 * Authentication Strategy:
 * - If a non-empty `token` string is provided, passes `{ auth: { token } }`.
 * - If `token` is omitted/undefined (e.g. cookie-based auth in production),
 *   omits the `auth` property entirely and relies on `withCredentials: true`
 *   for the browser to authenticate via HttpOnly cookies during the handshake.
 */
export const connectSocket = (token?: string): Socket => {
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

  // Only pass auth payload if a valid non-empty token is provided
  if (token && typeof token === "string" && token.trim() !== "") {
    options.auth = { token }
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
