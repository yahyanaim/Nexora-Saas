import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SidebarState {
  /** Wide sidebar with labels instead of the icon-only rail */
  expanded: boolean
  toggle: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      expanded: false,
      toggle: () => set((s) => ({ expanded: !s.expanded })),
    }),
    { name: "nexora:sidebar" }
  )
)
