import {
  ProjectHealth,
  TaskStatus,
  type Milestone,
  type MilestoneInput,
  type WorkProject,
  type WorkProjectInput,
  type WorkTask,
  type WorkTaskInput,
} from "@/types/work-projects"
import { createCollection } from "@/lib/workforce/demo-store"
import { seedMilestones, seedProjects, seedTasks } from "@/lib/workforce/project-seed"
import { recordTaskChanges } from "./task-collab-api"
import { getAuditActor, recordAudit } from "@/lib/workforce/audit"
import { wouldCreateCycle } from "@/lib/workforce/scheduling"
import { WorkProjectStatus, type CloseSnapshot } from "@/types/work-projects"

/**
 * Projects, their tasks and milestones. Backed by the browser demo store for
 * now; replace the bodies with apiClient calls once the backend exists.
 */
const projects = createCollection<WorkProject>("projects", "prj", seedProjects)
const tasks = createCollection<WorkTask>("tasks", "tsk", seedTasks)
const milestones = createCollection<Milestone>("milestones", "ms", seedMilestones)

// ---------- Projects ----------

export async function listProjectsApi(workspaceId: string): Promise<WorkProject[]> {
  return projects.list(workspaceId)
}

export async function getProjectApi(workspaceId: string, id: string): Promise<WorkProject | null> {
  return projects.get(workspaceId, id) ?? null
}

export async function createProjectApi(workspaceId: string, input: WorkProjectInput): Promise<WorkProject> {
  validateProject(workspaceId, input)
  return projects.create(workspaceId, withManagerAsMember(input))
}

export async function updateProjectApi(
  workspaceId: string,
  id: string,
  input: Partial<WorkProjectInput>
): Promise<WorkProject> {
  const current = projects.get(workspaceId, id)
  if (!current) throw new Error("Project not found")
  const next = withManagerAsMember({ ...current, ...input })
  validateProject(workspaceId, next, id)

  // People removed from the team no longer hold its tasks
  const removed = current.memberIds.filter((m) => !next.memberIds.includes(m))
  for (const task of tasks.list(workspaceId)) {
    if (task.projectId === id && task.assigneeId && removed.includes(task.assigneeId)) {
      tasks.update(workspaceId, task.id, { assigneeId: undefined })
    }
  }
  return projects.update(workspaceId, id, next)
}

/**
 * Closes a project (PRJ-13): it becomes completed, keeps a frozen copy of its
 * profitability, and no longer accepts hours.
 */
export async function closeProjectApi(workspaceId: string, id: string, snapshot: Omit<CloseSnapshot, "closedAt" | "closedBy">): Promise<WorkProject> {
  const current = projects.get(workspaceId, id)
  if (!current) throw new Error("Project not found")
  if (current.closedAt) throw new Error("This project is already closed")
  const actor = getAuditActor()
  const closedAt = new Date().toISOString()
  const saved = projects.update(workspaceId, id, {
    status: WorkProjectStatus.COMPLETED,
    closedAt,
    closeSnapshot: { ...snapshot, closedAt, closedBy: actor.name },
  })
  recordAudit(workspaceId, { action: "Project closed", actionKey: "project.closed", category: "Settings", target: `${current.code} ${current.name}`, before: current.status, after: saved.status })
  return saved
}

/** Reopens a closed project; the closing snapshot is kept for reference. */
export async function reopenProjectApi(workspaceId: string, id: string): Promise<WorkProject> {
  const current = projects.get(workspaceId, id)
  if (!current?.closedAt) throw new Error("This project isn't closed")
  recordAudit(workspaceId, { action: "Project reopened", actionKey: "project.reopened", category: "Settings", target: `${current.code} ${current.name}` })
  return projects.update(workspaceId, id, { status: WorkProjectStatus.ACTIVE, closedAt: undefined })
}

/** Sets or clears the manager's health override; setting one needs a reason (PRJ-10). */
export async function setHealthOverrideApi(
  workspaceId: string,
  id: string,
  override: { health: ProjectHealth; reason: string } | null
): Promise<WorkProject> {
  const project = projects.get(workspaceId, id)
  if (!project) throw new Error("Project not found")
  if (override && !override.reason.trim()) throw new Error("Say why the status differs from the automatic one")
  return projects.update(workspaceId, id, {
    healthOverride: override
      ? { health: override.health, reason: override.reason.trim(), setBy: getAuditActor().name, setAt: new Date().toISOString() }
      : undefined,
  })
}

/** Deletes the project with its tasks and milestones. */
export async function deleteProjectApi(workspaceId: string, id: string): Promise<void> {
  for (const task of tasks.list(workspaceId).filter((t) => t.projectId === id)) tasks.remove(workspaceId, task.id)
  for (const m of milestones.list(workspaceId).filter((x) => x.projectId === id)) milestones.remove(workspaceId, m.id)
  projects.remove(workspaceId, id)
}

function withManagerAsMember<T extends Pick<WorkProjectInput, "managerId" | "memberIds">>(input: T): T {
  if (!input.managerId || input.memberIds.includes(input.managerId)) return input
  return { ...input, memberIds: [input.managerId, ...input.memberIds] }
}

function validateProject(workspaceId: string, input: WorkProjectInput, exceptId?: string) {
  const code = input.code.trim().toUpperCase()
  if (projects.list(workspaceId).some((p) => p.id !== exceptId && p.code.toUpperCase() === code)) {
    throw new Error("Another project already uses this code")
  }
  if (input.dueDate && input.dueDate < input.startDate) {
    throw new Error("The due date can't be before the start date")
  }
}

// ---------- Tasks ----------

export async function listTasksApi(workspaceId: string, projectId?: string): Promise<WorkTask[]> {
  const all = tasks.list(workspaceId)
  return (projectId ? all.filter((t) => t.projectId === projectId) : all).sort((a, b) => a.order - b.order)
}

/** Predecessors must be tasks of the same project and never form a loop (PRJ-6). */
function assertDependencies(workspaceId: string, projectId: string, taskId: string | undefined, dependsOn?: string[]) {
  if (!dependsOn?.length) return
  const all = tasks.list(workspaceId).filter((t) => t.projectId === projectId)
  const id = taskId ?? "__new__"
  const self = { id, dependsOn: [] as string[] }
  const graph = [...all.filter((t) => t.id !== id), self]
  for (const p of dependsOn) {
    if (!all.some((t) => t.id === p)) throw new Error("A task can only wait for tasks of the same project")
    if (wouldCreateCycle(graph, id, p)) throw new Error("These dependencies would make tasks wait for each other in a loop")
    self.dependsOn.push(p)
  }
}

function assertDates(input: Partial<Pick<WorkTask, "startDate" | "dueDate">>) {
  if (input.startDate && input.dueDate && input.startDate > input.dueDate) throw new Error("The start date is after the due date")
}

export async function createTaskApi(workspaceId: string, input: WorkTaskInput): Promise<WorkTask> {
  assertAssigneeOnTeam(workspaceId, input.projectId, input.assigneeId)
  assertDependencies(workspaceId, input.projectId, undefined, input.dependsOn)
  assertDates(input)
  const order = nextOrder(workspaceId, input.projectId, input.status)
  const task = tasks.create(workspaceId, {
    ...input,
    order,
    completedAt: input.status === TaskStatus.DONE ? new Date().toISOString() : undefined,
  })
  recordTaskChanges(workspaceId, undefined, task)
  return task
}

export async function updateTaskApi(
  workspaceId: string,
  id: string,
  input: Partial<WorkTaskInput>
): Promise<WorkTask> {
  const current = tasks.get(workspaceId, id)
  if (!current) throw new Error("Task not found")
  if ("assigneeId" in input) assertAssigneeOnTeam(workspaceId, current.projectId, input.assigneeId)
  if ("dependsOn" in input) assertDependencies(workspaceId, current.projectId, id, input.dependsOn)
  assertDates({ startDate: input.startDate ?? current.startDate, dueDate: input.dueDate ?? current.dueDate })

  const patch: Partial<WorkTask> = { ...input }
  if (input.status && input.status !== current.status) {
    patch.order = nextOrder(workspaceId, current.projectId, input.status)
    patch.completedAt = input.status === TaskStatus.DONE ? new Date().toISOString() : undefined
  }
  const updated = tasks.update(workspaceId, id, patch)
  recordTaskChanges(workspaceId, current, updated)
  return updated
}

/**
 * Moves a task to a column (and position) on the board, renumbering that
 * column so orders stay 0..n-1.
 */
export async function moveTaskApi(
  workspaceId: string,
  id: string,
  status: TaskStatus,
  index?: number
): Promise<WorkTask> {
  const task = tasks.get(workspaceId, id)
  if (!task) throw new Error("Task not found")

  const column = tasks
    .list(workspaceId)
    .filter((t) => t.projectId === task.projectId && t.status === status && t.id !== id)
    .sort((a, b) => a.order - b.order)
  const at = index === undefined ? column.length : Math.max(0, Math.min(index, column.length))
  column.splice(at, 0, task)

  column.forEach((t, order) => {
    if (t.id === id) return
    if (t.order !== order) tasks.update(workspaceId, t.id, { order })
  })

  const completedAt =
    status === TaskStatus.DONE ? (task.status === TaskStatus.DONE ? task.completedAt : new Date().toISOString()) : undefined
  const moved = tasks.update(workspaceId, id, { status, order: at, completedAt })
  recordTaskChanges(workspaceId, task, moved)
  return moved
}

export async function deleteTaskApi(workspaceId: string, id: string): Promise<void> {
  // Tasks that waited for this one no longer do
  for (const t of tasks.list(workspaceId).filter((x) => x.dependsOn?.includes(id))) {
    tasks.update(workspaceId, t.id, { dependsOn: t.dependsOn!.filter((d) => d !== id) })
  }
  tasks.remove(workspaceId, id)
}

function nextOrder(workspaceId: string, projectId: string, status: TaskStatus) {
  const column = tasks.list(workspaceId).filter((t) => t.projectId === projectId && t.status === status)
  return column.reduce((max, t) => Math.max(max, t.order + 1), 0)
}

function assertAssigneeOnTeam(workspaceId: string, projectId: string, assigneeId?: string) {
  if (!assigneeId) return
  const project = projects.get(workspaceId, projectId)
  if (project && !project.memberIds.includes(assigneeId)) {
    throw new Error("Only people on the project team can be assigned")
  }
}

// ---------- Milestones ----------

export async function listMilestonesApi(workspaceId: string, projectId?: string): Promise<Milestone[]> {
  const all = milestones.list(workspaceId)
  return (projectId ? all.filter((m) => m.projectId === projectId) : all).sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  )
}

export async function createMilestoneApi(workspaceId: string, input: MilestoneInput): Promise<Milestone> {
  return milestones.create(workspaceId, input)
}

export async function updateMilestoneApi(
  workspaceId: string,
  id: string,
  input: Partial<MilestoneInput>
): Promise<Milestone> {
  return milestones.update(workspaceId, id, input)
}

/** Records (or withdraws) the client's sign-off. */
export async function setMilestoneApprovalApi(workspaceId: string, id: string, approved: boolean): Promise<Milestone> {
  return milestones.update(workspaceId, id, approved ? { approvedAt: new Date().toISOString(), rejectedAt: undefined } : { approvedAt: undefined })
}

/** Deletes a milestone; its tasks stay on the project without a milestone. */
export async function deleteMilestoneApi(workspaceId: string, id: string): Promise<void> {
  for (const task of tasks.list(workspaceId).filter((t) => t.milestoneId === id)) {
    tasks.update(workspaceId, task.id, { milestoneId: undefined })
  }
  milestones.remove(workspaceId, id)
}
