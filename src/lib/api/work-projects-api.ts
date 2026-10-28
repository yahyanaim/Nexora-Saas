import {
  ProjectHealth,
  TaskStatus,
  type Milestone,
  type TaskState,
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
import { isWebUrl, nextTaskNumber } from "@/lib/workforce/task-extras"
import { cycles } from "./cycle-store"
import { cleanTaskStates, projectStates, stateOf, validateTaskStates } from "@/lib/workforce/task-states"
import { WorkProjectStatus, type CloseSnapshot } from "@/types/work-projects"
import { assertRepeat, nextDates, taskBinDaysLeft } from "@/lib/workforce/task-repeat"

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
  if (input.taskStates) {
    // Tasks in a removed status fall back to the first status of its group (see stateOf)
    validateTaskStates(input.taskStates)
    input = { ...input, taskStates: cleanTaskStates(input.taskStates) }
  }
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
  for (const c of cycles.list(workspaceId).filter((x) => x.projectId === id)) cycles.remove(workspaceId, c.id)
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

/** What a task list can be narrowed to; the server takes the same as query parameters. */
export interface TaskFilter {
  /** Main assignee, collaborator or watcher */
  personId?: string
  status?: TaskStatus
  cycleId?: string
  dueFrom?: string
  dueTo?: string
}

/** Tasks in use; deleted ones wait in the project's deleted tasks (Project extras). */
export async function listTasksApi(workspaceId: string, projectId?: string, filter: TaskFilter = {}): Promise<WorkTask[]> {
  sweepTaskBin(workspaceId)
  const p = filter.personId
  return tasks
    .list(workspaceId)
    .filter(
      (t) =>
        !t.deletedAt &&
        (!projectId || t.projectId === projectId) &&
        (!p || t.assigneeId === p || !!t.collaboratorIds?.includes(p) || !!t.watcherIds?.includes(p)) &&
        (!filter.status || t.status === filter.status) &&
        (!filter.cycleId || t.cycleId === filter.cycleId) &&
        (!filter.dueFrom || (!!t.dueDate && t.dueDate >= filter.dueFrom)) &&
        (!filter.dueTo || (!!t.dueDate && t.dueDate <= filter.dueTo))
    )
    .sort((a, b) => a.order - b.order)
}

/** Predecessors must be tasks of the same project and never form a loop (PRJ-6). */
function assertDependencies(workspaceId: string, projectId: string, taskId: string | undefined, dependsOn?: string[]) {
  if (!dependsOn?.length) return
  const all = tasks.list(workspaceId).filter((t) => t.projectId === projectId && !t.deletedAt)
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

/** People on a task are on the project team; links are web addresses; related tasks exist (P1). */
function assertExtras(workspaceId: string, projectId: string, taskId: string | undefined, input: Partial<WorkTaskInput>, currentCycleId?: string) {
  // A task joins an open cycle of its own project (P4); staying in a closed one is fine
  if (input.cycleId && input.cycleId !== currentCycleId) {
    const cycle = cycles.get(workspaceId, input.cycleId)
    if (!cycle || cycle.projectId !== projectId) throw new Error("Cycle not found")
    if (cycle.closedAt) throw new Error("This cycle is closed")
  }
  for (const id of input.collaboratorIds ?? []) assertAssigneeOnTeam(workspaceId, projectId, id)
  if ((input.links ?? []).some((l) => !isWebUrl(l.url))) throw new Error("A link must start with http:// or https://")
  for (const r of input.relations ?? []) {
    if (r.taskId === taskId) throw new Error("A task can't be linked to itself")
    if (!tasks.get(workspaceId, r.taskId) || tasks.get(workspaceId, r.taskId)!.deletedAt) throw new Error("Task not found")
  }
}

/** Duplicates removed and the main person not repeated among the others. */
function cleanExtras<T extends Partial<WorkTaskInput>>(input: T): T {
  const out = { ...input }
  if (out.collaboratorIds) out.collaboratorIds = [...new Set(out.collaboratorIds)].filter((id) => id !== out.assigneeId)
  if (out.watcherIds) out.watcherIds = [...new Set(out.watcherIds)]
  if (out.relations) out.relations = out.relations.filter((r, i, all) => all.findIndex((x) => x.taskId === r.taskId) === i)
  if (out.links) out.links = out.links.map((l) => ({ ...l, url: l.url.trim(), title: l.title?.trim() || undefined }))
  return out
}

export async function createTaskApi(workspaceId: string, raw: WorkTaskInput): Promise<WorkTask> {
  const input = cleanExtras(raw)
  assertAssigneeOnTeam(workspaceId, input.projectId, input.assigneeId)
  assertDependencies(workspaceId, input.projectId, undefined, input.dependsOn)
  assertExtras(workspaceId, input.projectId, undefined, input)
  assertDates(input)
  assertRepeat(input.repeat)
  const states = statesFor(workspaceId, input.projectId)
  const placed = { ...input, ...placeIn(states, input.stateId ?? input.status) }
  const order = nextOrder(workspaceId, states, placed)
  const task = tasks.create(workspaceId, {
    ...placed,
    number: nextTaskNumber(tasks.list(workspaceId), input.projectId),
    order,
    completedAt: placed.status === TaskStatus.DONE ? new Date().toISOString() : undefined,
  })
  recordTaskChanges(workspaceId, undefined, task, states)
  return task
}

export async function updateTaskApi(
  workspaceId: string,
  id: string,
  raw: Partial<WorkTaskInput>
): Promise<WorkTask> {
  const current = tasks.get(workspaceId, id)
  if (!current || current.deletedAt) throw new Error("Task not found")
  assertRepeat(raw.repeat)
  const input = cleanExtras({ ...raw, assigneeId: "assigneeId" in raw ? raw.assigneeId : current.assigneeId })
  if (!("assigneeId" in raw)) delete input.assigneeId
  if ("assigneeId" in input) assertAssigneeOnTeam(workspaceId, current.projectId, input.assigneeId)
  assertExtras(workspaceId, current.projectId, id, input, current.cycleId)
  if ("dependsOn" in input) assertDependencies(workspaceId, current.projectId, id, input.dependsOn)
  assertDates({ startDate: input.startDate ?? current.startDate, dueDate: input.dueDate ?? current.dueDate })

  const states = statesFor(workspaceId, current.projectId)
  const patch: Partial<WorkTask> = { ...input }
  // A new status (P2) sets its group; a new group alone lands in the group's first status
  if (input.stateId || (input.status && input.status !== current.status)) Object.assign(patch, placeIn(states, input.stateId ?? input.status!))
  const next = { ...current, ...patch }
  if (stateOf(next, states).id !== stateOf(current, states).id) patch.order = nextOrder(workspaceId, states, next)
  if (next.status !== current.status) patch.completedAt = next.status === TaskStatus.DONE ? new Date().toISOString() : undefined
  const updated = tasks.update(workspaceId, id, patch)
  recordTaskChanges(workspaceId, current, updated, states)
  return current.status !== TaskStatus.DONE && updated.status === TaskStatus.DONE ? repeatTask(workspaceId, updated, states) : updated
}

/**
 * Moves a task to a column (and position) on the board, renumbering that
 * column so orders stay 0..n-1. The column is one of the project's
 * statuses (P2); a group name lands in that group's first status.
 */
export async function moveTaskApi(
  workspaceId: string,
  id: string,
  target: string,
  index?: number
): Promise<WorkTask> {
  const task = tasks.get(workspaceId, id)
  if (!task) throw new Error("Task not found")
  const states = statesFor(workspaceId, task.projectId)
  const { status, stateId } = placeIn(states, target)

  const column = tasks
    .list(workspaceId)
    .filter((t) => t.projectId === task.projectId && stateOf(t, states).id === stateId && t.id !== id)
    .sort((a, b) => a.order - b.order)
  const at = index === undefined ? column.length : Math.max(0, Math.min(index, column.length))
  column.splice(at, 0, task)

  column.forEach((t, order) => {
    if (t.id === id) return
    if (t.order !== order) tasks.update(workspaceId, t.id, { order })
  })

  const completedAt =
    status === TaskStatus.DONE ? (task.status === TaskStatus.DONE ? task.completedAt : new Date().toISOString()) : undefined
  const moved = tasks.update(workspaceId, id, { status, stateId, order: at, completedAt })
  recordTaskChanges(workspaceId, task, moved, states)
  return task.status !== TaskStatus.DONE && moved.status === TaskStatus.DONE ? repeatTask(workspaceId, moved, states) : moved
}

/**
 * A repeating task just done (Project extras): its next one is created once,
 * to do, with the dates moved on, the same people, labels, phase, estimate
 * and checklist (unticked), outside any cycle.
 */
function repeatTask(workspaceId: string, task: WorkTask, states: TaskState[]): WorkTask {
  if (!task.repeat || task.nextTaskId) return task
  const dates = nextDates(task, new Date().toISOString().slice(0, 10))
  if (!dates) return task
  const placed = placeIn(states, TaskStatus.TODO)
  const next = tasks.create(workspaceId, {
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeId: task.assigneeId,
    collaboratorIds: task.collaboratorIds,
    watcherIds: task.watcherIds,
    links: task.links,
    labelIds: task.labelIds,
    estimatedHours: task.estimatedHours,
    subtasks: task.subtasks.map((x) => ({ ...x, done: false })),
    repeat: task.repeat,
    ...dates,
    ...placed,
    number: nextTaskNumber(tasks.list(workspaceId), task.projectId),
    order: nextOrder(workspaceId, states, { projectId: task.projectId, ...placed }),
  })
  recordTaskChanges(workspaceId, undefined, next, states)
  return tasks.update(workspaceId, task.id, { nextTaskId: next.id })
}

/**
 * Moves a task to the project's deleted tasks for TASK_BIN_DAYS days
 * (Project extras). Tasks that waited for it, or pointed at it, no longer do.
 */
export async function deleteTaskApi(workspaceId: string, id: string): Promise<void> {
  const task = tasks.get(workspaceId, id)
  if (!task || task.deletedAt) return
  for (const t of tasks.list(workspaceId).filter((x) => x.dependsOn?.includes(id) || x.relations?.some((r) => r.taskId === id))) {
    tasks.update(workspaceId, t.id, { dependsOn: t.dependsOn?.filter((d) => d !== id), relations: t.relations?.filter((r) => r.taskId !== id) })
  }
  tasks.update(workspaceId, id, { deletedAt: new Date().toISOString(), deletedBy: getAuditActor().name })
}

/** A project's deleted tasks, most recently deleted first. */
export async function listDeletedTasksApi(workspaceId: string, projectId: string): Promise<WorkTask[]> {
  sweepTaskBin(workspaceId)
  return tasks
    .list(workspaceId)
    .filter((t) => t.projectId === projectId && t.deletedAt)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!))
}

/** Brings a deleted task back where it was; a closed cycle or a person off the team is let go. */
export async function restoreTaskApi(workspaceId: string, id: string): Promise<WorkTask> {
  const task = tasks.get(workspaceId, id)
  if (!task?.deletedAt) throw new Error("This task is not in the deleted tasks")
  const project = projects.get(workspaceId, task.projectId)
  if (!project) throw new Error("Project not found")
  const cycle = task.cycleId ? cycles.get(workspaceId, task.cycleId) : undefined
  return tasks.update(workspaceId, id, {
    deletedAt: undefined,
    deletedBy: undefined,
    cycleId: cycle && !cycle.closedAt ? task.cycleId : undefined,
    assigneeId: task.assigneeId && project.memberIds.includes(task.assigneeId) ? task.assigneeId : undefined,
  })
}

/** Removes a deleted task for good. */
export async function purgeTaskApi(workspaceId: string, id: string): Promise<void> {
  if (!tasks.get(workspaceId, id)?.deletedAt) throw new Error("This task is not in the deleted tasks")
  tasks.remove(workspaceId, id)
}

function sweepTaskBin(workspaceId: string) {
  for (const t of tasks.list(workspaceId)) if (t.deletedAt && taskBinDaysLeft(t.deletedAt) === 0) tasks.remove(workspaceId, t.id)
}

function nextOrder(workspaceId: string, states: TaskState[], task: Pick<WorkTask, "projectId" | "status" | "stateId">) {
  const stateId = stateOf(task, states).id
  const column = tasks.list(workspaceId).filter((t) => t.projectId === task.projectId && stateOf(t, states).id === stateId)
  return column.reduce((max, t) => Math.max(max, t.order + 1), 0)
}

function statesFor(workspaceId: string, projectId: string) {
  return projectStates(projects.get(workspaceId, projectId))
}

/** The status and group for a status id, or for a group (its first status). */
function placeIn(states: TaskState[], target: string): { status: TaskStatus; stateId: string } {
  const state = states.find((s) => s.id === target) ?? states.find((s) => s.group === target)
  if (!state) throw new Error("This status isn't part of the project")
  return { status: state.group, stateId: state.id }
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
