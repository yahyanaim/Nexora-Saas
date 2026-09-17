import { useCallback, useEffect, useState } from "react"

export function useBrowserNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default")

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission)
      }
    })
  }, [])

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === "granted"
  }, [])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return
      // Don't notify if user is looking at the page
      if (document.visibilityState === "visible" && document.hasFocus()) return

      try {
        new Notification(title, {
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: "new-message",
          requireInteraction: false,
          ...options,
        })
      } catch {
        // Silent fail
      }
    },
    [permission]
  )

  return { permission, requestPermission, sendNotification }
}
