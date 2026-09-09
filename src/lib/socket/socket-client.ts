import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

let pendingResolvers: Array<(socket: Socket) => void> = []

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

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket

  socket = io("/", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
  })

  pendingResolvers.forEach((resolve) => resolve(socket!))
  pendingResolvers = []

  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}
