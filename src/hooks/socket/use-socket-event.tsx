import { useSocket } from "@/contexts/socket-provider"
import { useEffect, useRef } from "react"

export const useSocketEvent = <T = unknown,>(
  event: string,
  handler: (data: T) => void
) => {
  const { socket } = useSocket()
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!socket) return

    const eventHandler = (data: T) => {
      handlerRef.current(data)
    }

    socket.on(event, eventHandler)

    return () => {
      socket.off(event, eventHandler)
    }
  }, [socket, event])
}
