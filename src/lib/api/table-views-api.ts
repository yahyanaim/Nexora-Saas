import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor } from "@/lib/workforce/audit"
import { MAX_VIEWS, saveView, type TableView, type TableViewState } from "@/lib/ui/saved-views"

/**
 * Views of a list shared with the whole team (CRM step 10). Personal views
 * stay in the browser (saved-views.ts); these live with the workspace, so the
 * backend will store them per company.
 */
interface SharedView extends TableView {
  workspaceId: string
  list: string
  createdAt: string
  updatedAt: string
}

const views = createCollection<SharedView>("table-views", "tv", () => [])

export async function listSharedViewsApi(workspaceId: string, list: string): Promise<TableView[]> {
  return views.list(workspaceId).filter((v) => v.list === list).slice(0, MAX_VIEWS)
}

/** Shares a view; one with the same name is replaced only when it is your own. */
export async function saveSharedViewApi(workspaceId: string, list: string, name: string, state: TableViewState): Promise<TableView> {
  const actor = getAuditActor()
  const same = views.list(workspaceId).find((v) => v.list === list && v.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())
  if (same && same.ownerId !== actor.id) throw new Error("A team view already has this name")
  const [view] = saveView([], name, state, "tmp")
  if (!view) throw new Error("Give the view a name")
  const fields = { list, name: view.name, sorting: view.sorting, columnFilters: view.columnFilters, pageSize: view.pageSize, extra: view.extra, shared: true, ownerId: actor.id, ownerName: actor.name }
  return same ? views.update(workspaceId, same.id, fields) : views.create(workspaceId, fields)
}

/** Removes a team view; only the person who shared it, or someone who manages roles, may. */
export async function deleteSharedViewApi(workspaceId: string, id: string, canManage: boolean): Promise<void> {
  const view = views.get(workspaceId, id)
  if (!view) return
  if (view.ownerId !== getAuditActor().id && !canManage) throw new Error("Only the person who shared this view can remove it")
  views.remove(workspaceId, id)
}
