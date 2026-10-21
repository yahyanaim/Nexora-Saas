import type { TaskView, TaskViewInput } from "@/types/work-projects"
import { createCollection } from "@/lib/workforce/demo-store"

/**
 * Saved task views (P2), personal or shared with the project's team. Kept in
 * the browser demo store for now; the server will keep them per workspace.
 */
const seed = (workspaceId: string): TaskView[] =>
  workspaceId === "ws_atlas"
    ? [
        {
          id: "view_orbit_lina",
          workspaceId,
          projectId: "prj_orbit",
          name: "Lina's work by priority",
          ownerId: "emp_karim",
          ownerName: "Karim Haddad",
          shared: true,
          tab: "spreadsheet",
          filters: { assigneeId: "emp_lina", labelId: "__all__", priority: "__all__" },
          groupBy: "priority",
          thenBy: "none",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    : []

const views = createCollection<TaskView>("task-views", "view", seed)

export const MAX_VIEW_NAME = 40

export interface ViewOwner {
  id: string
  name: string
}

/** The views someone sees on a project: their own and the shared ones, their own first. */
export async function listTaskViewsApi(workspaceId: string, projectId: string, userId: string): Promise<TaskView[]> {
  return views
    .list(workspaceId)
    .filter((v) => v.projectId === projectId && (v.shared || v.ownerId === userId))
    .sort((a, b) => Number(b.ownerId === userId) - Number(a.ownerId === userId) || a.name.localeCompare(b.name))
}

/** Saves a view; saving again under one of your own names replaces it. */
export async function saveTaskViewApi(workspaceId: string, input: TaskViewInput, owner: ViewOwner): Promise<TaskView> {
  const name = input.name.trim()
  if (!name) throw new Error("Give the view a name")
  if (name.length > MAX_VIEW_NAME) throw new Error("A view name can have up to 40 characters")
  const same = views.list(workspaceId).filter((v) => v.projectId === input.projectId && v.name.toLowerCase() === name.toLowerCase())
  if (same.some((v) => v.ownerId !== owner.id && v.shared)) throw new Error("A shared view already has this name")
  const mine = same.find((v) => v.ownerId === owner.id)
  const data = { ...input, name }
  return mine ? views.update(workspaceId, mine.id, data) : views.create(workspaceId, { ...data, ownerId: owner.id, ownerName: owner.name })
}

/** Shares a view with the team or makes it personal again; only its owner can. */
export async function setTaskViewSharedApi(workspaceId: string, id: string, shared: boolean, userId: string): Promise<TaskView> {
  const view = views.get(workspaceId, id)
  if (!view) throw new Error("This view no longer exists")
  if (view.ownerId !== userId) throw new Error("Only the person who saved a view can change it")
  return views.update(workspaceId, id, { shared })
}

/** Deletes a view: its owner can, and a project manager can remove a shared one. */
export async function deleteTaskViewApi(workspaceId: string, id: string, userId: string, canManage: boolean): Promise<void> {
  const view = views.get(workspaceId, id)
  if (!view) return
  if (view.ownerId !== userId && !(canManage && view.shared)) throw new Error("Only the person who saved a view can change it")
  views.remove(workspaceId, id)
}
