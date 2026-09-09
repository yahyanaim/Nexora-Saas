import { useNotificationStore } from "@/store/notifications/notifications-store"

export function useNotificationSettings() {
  const settings = useNotificationStore((state) => state.settings)
  const updateSetting = useNotificationStore((state) => state.updateSetting)

  return { settings, updateSetting }
}
