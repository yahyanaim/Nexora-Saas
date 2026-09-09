import { create } from "zustand"

interface LockScreenState {
  isUnlocked: boolean
  unlock: () => void
  lock: () => void
}

export const useLockScreenStore = create<LockScreenState>((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}))
