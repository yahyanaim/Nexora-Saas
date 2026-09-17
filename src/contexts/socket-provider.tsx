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
  const { isAuthenticated, token } = useAuthGuard()

  const connect = useCallback(() => {
    if (!isAuthenticated) {
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

    const onConnectError = (err: Error) => {
      const message = err?.message?.toLowerCase() || ""
      const isAuthError =
        message.includes("unauthorized") ||
        message.includes("forbidden") ||
        message.includes("jwt") ||
        message.includes("auth")

      if (isAuthError) {
        console.warn(
          "[Socket Auth] Handshake rejected by server:",
          err?.message || err
        )
      }

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
  }, [isAuthenticated, token, socket?.connected, authAnnounceLogin, sendNotification])

  const reconnect = useCallback(() => {
    if (!isAuthenticated) return

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }

    setSocket(null)
    setIsConnected(false)
    setIsConnecting(true)

    setTimeout(() => connect(), 100)
  }, [connect, isAuthenticated, socket])

  useEffect(() => {
    let cleanup: (() => void) | void
    const timeoutId = setTimeout(() => {
      if (isAuthenticated) {
        cleanup = connect()
      } else {
        if (socket) {
          socket.removeAllListeners()
          socket.disconnect()
          setSocket(null)
        }
        setIsConnected(false)
        setIsConnecting(false)
      }
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) cleanup()
    }
  }, [isAuthenticated, connect, socket])

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      socket?.disconnect()
    }

    const handleOnline = () => {
      setIsOffline(false)
      if (isAuthenticated && !socket?.connected) {
        reconnect()
      }
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [isAuthenticated, reconnect, socket])

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
