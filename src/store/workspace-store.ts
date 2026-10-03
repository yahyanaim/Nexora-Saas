import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEMO_WORKSPACES } from "@/lib/workforce/demo-seed"
import type { Workspace } from "@/types/workforce"

const DEFAULT_WORKSPACE = DEMO_WORKSPACES[0]!

interface WorkspaceState {
  workspaces: Workspace[]
  currentId: string
  setCurrent: (id: string) => void
}

/** The workspace (company) every workforce screen reads and writes. */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: DEMO_WORKSPACES,
      currentId: DEFAULT_WORKSPACE.id,
      setCurrent: (id) => {
        if (get().workspaces.some((w) => w.id === id)) set({ currentId: id })
      },
    }),
    {
      name: "nexora:workspace",
      // Only the choice persists; the list comes from the code (later: the API)
      partialize: (state) => ({ currentId: state.currentId }),
    }
  )
)

export function useCurrentWorkspace(): Workspace {
  return useWorkspaceStore(
    (s) => s.workspaces.find((w) => w.id === s.currentId) ?? DEFAULT_WORKSPACE
  )
}
