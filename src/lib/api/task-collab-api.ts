import type { Employee } from "@/types/workforce"
import type { TaskActivity, TaskAttachment, TaskComment, WorkTask } from "@/types/work-projects"
import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor } from "@/lib/workforce/audit"

/**
 * Comments with @mentions and the automatic history of each task (PRJ-7).
 * Browser demo store for now; the backend will own both.
 */
const comments = createCollection<TaskComment>("task-comments", "cmt", () => [])
const activity = createCollection<TaskActivity>("task-activity", "act", () => [])
const attachments = createCollection<TaskAttachment>("task-attachments", "att", () => [])

/** Biggest file the browser demo keeps (the server will take larger files). */
export const MAX_ATTACHMENT_BYTES = 500 * 1024
export const MAX_ATTACHMENTS = 10

export async function listTaskAttachmentsApi(workspaceId: string, taskId: string): Promise<TaskAttachment[]> {
  return attachments
    .list(workspaceId)
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Attaches a file to a task (P1); it shows in the task's history. */
export async function addTaskAttachmentApi(workspaceId: string, taskId: string, file: Pick<TaskAttachment, "name" | "type" | "size" | "dataUrl">): Promise<TaskAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Files are limited to 500 KB for now")
  if ((await listTaskAttachmentsApi(workspaceId, taskId)).length >= MAX_ATTACHMENTS) throw new Error("A task can hold 10 files")
  if (!/^data:[\w.+/-]*;base64,/.test(file.dataUrl)) throw new Error("This file could not be read")
  const actorName = getAuditActor().name
  const saved = attachments.create(workspaceId, { taskId, name: file.name.slice(0, 200), type: file.type || "application/octet-stream", size: file.size, dataUrl: file.dataUrl, addedBy: actorName })
  activity.create(workspaceId, { taskId, actorName, kind: "attachment", to: saved.name })
  return saved
}

export async function removeTaskAttachmentApi(workspaceId: string, id: string) {
  attachments.remove(workspaceId, id)
}

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
  if ((before.collaboratorIds ?? []).join() !== (after.collaboratorIds ?? []).join()) add("collaborators", (before.collaboratorIds ?? []).join(","), (after.collaboratorIds ?? []).join(","))
  if (before.dueDate !== after.dueDate) add("due", before.dueDate, after.dueDate)
  if (before.estimatedHours !== after.estimatedHours) add("estimate", String(before.estimatedHours), String(after.estimatedHours))
  if (before.title !== after.title) add("title", before.title, after.title)
  if ((before.labelIds ?? []).join() !== (after.labelIds ?? []).join()) add("labels", (before.labelIds ?? []).join(","), (after.labelIds ?? []).join(","))
}
