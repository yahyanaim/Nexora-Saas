import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEMO_WORKSPACES } from "@/lib/workforce/demo-seed"
import type { Workspace } from "@/types/workforce"

const DEFAULT_WORKSPACE = DEMO_WORKSPACES[0]!

interface WorkspaceState {
  workspaces: Workspace[]
  currentId: string
  setCurrent: (id: string) => void
  /** Puts in the list from the server; keeps the choice if it is still there */
  setWorkspaces: (list: Workspace[]) => void
  /** Keeps amounts on screen in the company's base currency from Settings */
  setCurrency: (id: string, currency: string) => void
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
      setWorkspaces: (list) => {
        if (!list.length) return
        const keep = list.some((w) => w.id === get().currentId)
        // a currency already read from Settings stays (it may have loaded first)
        const known = new Map(get().workspaces.map((w) => [w.id, w.currency]))
        set({ workspaces: list.map((w) => ({ ...w, currency: known.get(w.id) ?? w.currency })), currentId: keep ? get().currentId : list[0]!.id })
      },
      setCurrency: (id, currency) => {
        if (get().workspaces.some((w) => w.id === id && w.currency !== currency)) {
          set({ workspaces: get().workspaces.map((w) => (w.id === id ? { ...w, currency } : w)) })
        }
      },
    }),
    {
      name: "nexora:workspace",
      // Only the choice persists; the list comes from GET /me/workspaces
      partialize: (state) => ({ currentId: state.currentId }),
    }
  )
)

export function useCurrentWorkspace(): Workspace {
  return useWorkspaceStore(
    (s) => s.workspaces.find((w) => w.id === s.currentId) ?? DEFAULT_WORKSPACE
  )
}

/** Loads the signed-in person's companies once; on failure the list stays as it is. */
export async function loadMyWorkspaces(): Promise<void> {
  const { listMyWorkspacesApi } = await import("@/lib/api/me-api")
  try {
    useWorkspaceStore.getState().setWorkspaces(await listMyWorkspacesApi())
  } catch {
    // the switcher keeps the list it has
  }
}
