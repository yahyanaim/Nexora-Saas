// stores/authStore.ts
import { create } from "zustand"

interface AuthState {
  // State
  isRedirecting: boolean
  redirectAttempted: boolean

  // Actions
  setRedirecting: (value: boolean) => void
  setRedirectAttempted: (value: boolean) => void
  resetRedirectState: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isRedirecting: false,
  redirectAttempted: false,

  setRedirecting: (value) => set({ isRedirecting: value }),
  setRedirectAttempted: (value) => set({ redirectAttempted: value }),
  resetRedirectState: () =>
    set({ isRedirecting: false, redirectAttempted: false }),
}))
