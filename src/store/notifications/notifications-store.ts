import { NotificationSettings } from "@/types/notification"
import { create } from "zustand"
import { persist } from "zustand/middleware"

const DEFAULT_SETTINGS: NotificationSettings = {
  privateSpaces: true,
  groups: true,
  channels: true,
  showPreview: true,
  sound: true,
  browserNotifications: false,
}

interface NotificationStore {
  settings: NotificationSettings
  updateSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void
  resetSettings: () => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "notification-settings-v1",
    }
  )
)
