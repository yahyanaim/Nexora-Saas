import {
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

export async function createTaskApi(workspaceId: string, input: WorkTaskInput): Promise<WorkTask> {
  assertAssigneeOnTeam(workspaceId, input.projectId, input.assigneeId)
  const order = nextOrder(workspaceId, input.projectId, input.status)
  return tasks.create(workspaceId, {
    ...input,
    order,
    completedAt: input.status === TaskStatus.DONE ? new Date().toISOString() : undefined,
  })
}

export async function updateTaskApi(
  workspaceId: string,
  id: string,
  input: Partial<WorkTaskInput>
): Promise<WorkTask> {
  const current = tasks.get(workspaceId, id)
  if (!current) throw new Error("Task not found")
  if ("assigneeId" in input) assertAssigneeOnTeam(workspaceId, current.projectId, input.assigneeId)

  const patch: Partial<WorkTask> = { ...input }
  if (input.status && input.status !== current.status) {
    patch.order = nextOrder(workspaceId, current.projectId, input.status)
    patch.completedAt = input.status === TaskStatus.DONE ? new Date().toISOString() : undefined
  }
  return tasks.update(workspaceId, id, patch)
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
  return tasks.update(workspaceId, id, { status, order: at, completedAt })
}

export async function deleteTaskApi(workspaceId: string, id: string): Promise<void> {
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
  return milestones.update(workspaceId, id, { approvedAt: approved ? new Date().toISOString() : undefined })
}

/** Deletes a milestone; its tasks stay on the project without a milestone. */
export async function deleteMilestoneApi(workspaceId: string, id: string): Promise<void> {
  for (const task of tasks.list(workspaceId).filter((t) => t.milestoneId === id)) {
    tasks.update(workspaceId, task.id, { milestoneId: undefined })
  }
  milestones.remove(workspaceId, id)
}
