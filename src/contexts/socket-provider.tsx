"use client"

import { useAuthAnnounceLogin } from "@/hooks/auth/use-auth-announce-login"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useBrowserNotifications } from "@/hooks/notifications/use-browser-notifications"
import { connectSocket } from "@/lib/socket/socket-client"
import { SocketEvents } from "@/types/socket"
import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useContext,
} from "react"
import { Socket } from "socket.io-client"

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  isOffline: boolean
  joinSpace: (spaceId: string) => void
  leaveSpace: (spaceId: string) => void
  reconnect: () => void
}

export const SocketContext = createContext<SocketContextValue | null>(null)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const { mutate: authAnnounceLogin } = useAuthAnnounceLogin()
  const { sendNotification } = useBrowserNotifications()

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  )
  const { token } = useAuthGuard()

  const connect = useCallback(() => {
    if (!token) {
      setIsConnecting(false)
      return
    }

    if (socket?.connected) {
      setIsConnected(true)
      setIsConnecting(false)
      return
    }

    const s = connectSocket(token)

    const onConnect = () => {
      setIsConnected(true)
      setIsConnecting(false)
      const consumeLoginAnnounce = localStorage.getItem(
        "consume-login-announce"
      )
      if (consumeLoginAnnounce === "pending") {
        sendNotification("New login detected", {
          body: "A new login to your account was detected.",
          icon: "/app-logo.png",
          tag: "new-login",
        })
        authAnnounceLogin()
        localStorage.removeItem("consume-login-announce")
      }
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    const onConnectError = () => {
      setIsConnected(false)
      setIsConnecting(false)
    }

    s.on("connect", onConnect)
    s.on("disconnect", onDisconnect)
    s.on("connect_error", onConnectError)

    if (s.connected) {
      setIsConnected(true)
      setIsConnecting(false)
    }

    setSocket(s)

    return () => {
      s.off("connect", onConnect)
      s.off("disconnect", onDisconnect)
      s.off("connect_error", onConnectError)
      s.removeAllListeners()
      s.disconnect()
    }
  }, [token, socket?.connected])

  const reconnect = useCallback(() => {
    if (!token) return

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }

    setSocket(null)
    setIsConnected(false)
    setIsConnecting(true)

    setTimeout(() => connect(), 100)
  }, [connect, token, socket])

  useEffect(() => {
    if (token) {
      const cleanup = connect()
      return () => {
        if (cleanup) cleanup()
      }
    } else {
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
        setSocket(null)
      }
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [token, connect])

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      socket?.disconnect()
    }

    const handleOnline = () => {
      setIsOffline(false)
      if (token && !socket?.connected) {
        reconnect()
      }
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [token, reconnect, socket])

  const joinSpace = useCallback(
    (spaceId: string) => {
      socket?.emit(SocketEvents.SPACE_JOIN, { spaceId })
    },
    [socket]
  )

  const leaveSpace = useCallback(
    (spaceId: string) => {
      socket?.emit(SocketEvents.SPACE_LEAVE, { spaceId })
    },
    [socket]
  )

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isConnecting,
        isOffline,
        joinSpace,
        leaveSpace,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error("useSocket must be inside SocketProvider")
  return ctx
}
