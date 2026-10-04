import type { Employee } from "@/types/workforce"
import type { TaskActivity, TaskComment, WorkTask } from "@/types/work-projects"
import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor } from "@/lib/workforce/audit"

/**
 * Comments with @mentions and the automatic history of each task (PRJ-7).
 * Browser demo store for now; the backend will own both.
 */
const comments = createCollection<TaskComment>("task-comments", "cmt", () => [])
const activity = createCollection<TaskActivity>("task-activity", "act", () => [])

/** Employee ids mentioned as @First Last (or @First when unique) in a comment. */
export function findMentions(body: string, people: Pick<Employee, "id" | "name">[]): string[] {
  const text = body.toLowerCase()
  const ids = new Set<string>()
  for (const person of people) {
    const full = `@${person.name.toLowerCase()}`
    const first = `@${person.name.split(" ")[0]!.toLowerCase()}`
    const firstIsUnique = people.filter((p) => p.name.split(" ")[0]!.toLowerCase() === first.slice(1)).length === 1
    if (text.includes(full) || (firstIsUnique && new RegExp(`${escapeRegex(first)}\\b`).test(text))) ids.add(person.id)
  }
  return [...ids]
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function listTaskCommentsApi(workspaceId: string, taskId: string): Promise<TaskComment[]> {
  return comments
    .list(workspaceId)
    .filter((c) => c.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addTaskCommentApi(
  workspaceId: string,
  taskId: string,
  body: string,
  people: Pick<Employee, "id" | "name">[]
): Promise<TaskComment> {
  const text = body.trim()
  if (!text) throw new Error("Write a comment first")
  if (text.length > 5000) throw new Error("Comments are limited to 5,000 characters")
  return comments.create(workspaceId, { taskId, body: text, authorName: getAuditActor().name, mentionIds: findMentions(text, people) })
}

export async function deleteTaskCommentApi(workspaceId: string, id: string) {
  comments.remove(workspaceId, id)
}

export async function listTaskActivityApi(workspaceId: string, taskId: string): Promise<TaskActivity[]> {
  return activity
    .list(workspaceId)
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Writes history rows for the fields that changed between two versions of a task. */
export function recordTaskChanges(workspaceId: string, before: WorkTask | undefined, after: WorkTask) {
  const actorName = getAuditActor().name
  const add = (kind: TaskActivity["kind"], from?: string, to?: string) =>
    activity.create(workspaceId, { taskId: after.id, actorName, kind, from, to })
  if (!before) return add("created", undefined, after.status)
  if (before.status !== after.status) add("status", before.status, after.status)
  if (before.assigneeId !== after.assigneeId) add("assignee", before.assigneeId, after.assigneeId)
  if (before.dueDate !== after.dueDate) add("due", before.dueDate, after.dueDate)
  if (before.estimatedHours !== after.estimatedHours) add("estimate", String(before.estimatedHours), String(after.estimatedHours))
  if (before.title !== after.title) add("title", before.title, after.title)
  if ((before.labelIds ?? []).join() !== (after.labelIds ?? []).join()) add("labels", (before.labelIds ?? []).join(","), (after.labelIds ?? []).join(","))
}
