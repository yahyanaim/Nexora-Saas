import { create } from "zustand"
import { persist } from "zustand/middleware"
import { NewLoginAlert } from "@/types/auth"
import { Session } from "@/types/sessions"

interface LoginAlertState {
  alerts: NewLoginAlert[]
  addAlert: (session: Session) => void
  removeAlert: (sessionId: string) => void
  clearAll: () => void
}

export const useLoginAlertStore = create<LoginAlertState>()(
  persist(
    (set) => ({
      alerts: [],

      addAlert: (session) =>
        set((state) => {
          if (state.alerts.some((a) => a.session.id === session.id)) {
            return state
          }
          return {
            alerts: [
              ...state.alerts,
              { session, receivedAt: new Date().toISOString() },
            ],
          }
        }),

      removeAlert: (sessionId) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.session.id !== sessionId),
        })),

      clearAll: () => set({ alerts: [] }),
    }),
    {
      name: "login-alerts-storage",
    }
  )
)
