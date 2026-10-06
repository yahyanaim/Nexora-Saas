import {
  ProjectHealth,
  TaskStatus,
  WorkProjectStatus,
  type Milestone,
  type WorkProject,
  type WorkTask,
} from "@/types/work-projects"

let companyTimeZone: string | undefined

/**
 * Business dates follow the company's time zone (Settings → Company), not the
 * browser's (M2): "today", "overdue" and period locks are the same for a user
 * in Casablanca and one travelling. Set from the workspace settings.
 */
export function setCompanyTimeZone(timeZone: string | undefined) {
  try {
    if (timeZone) new Intl.DateTimeFormat("en-CA", { timeZone })
    companyTimeZone = timeZone || undefined
  } catch {
    companyTimeZone = undefined
  }
}

/** Today as yyyy-mm-dd in the company time zone (local time until it is known). */
export function todayIso(now = new Date(), timeZone = companyTimeZone) {
  if (timeZone) {
    // en-CA formats dates as yyyy-mm-dd
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  }
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/**
 * Share of the work done, 0–100. Tasks weigh by their estimate (at least one
 * hour each) so a big task counts more than a small one.
 */
export function taskProgress(tasks: WorkTask[]): number {
  if (tasks.length === 0) return 0
  let total = 0
  let done = 0
  for (const task of tasks) {
    const weight = Math.max(1, task.estimatedHours)
    total += weight
    if (task.status === TaskStatus.DONE) done += weight
  }
  return Math.round((done / total) * 100)
}

export function isTaskOverdue(task: WorkTask, today = todayIso()) {
  return !!task.dueDate && task.status !== TaskStatus.DONE && task.dueDate < today
}

/**
 * On track, at risk or late:
 * - late once the due date has passed and the project isn't finished
 * - at risk when any task is overdue, or progress trails the time used by more than 20 points
 */
export function projectHealth(
  project: WorkProject,
  tasks: WorkTask[],
  today = todayIso()
): ProjectHealth {
  if (project.status === WorkProjectStatus.COMPLETED || project.status === WorkProjectStatus.CANCELLED) {
    return ProjectHealth.DONE
  }
  // A manager's override (with its reason) wins over the automatic status (PRJ-10)
  if (project.healthOverride) return project.healthOverride.health
  return automaticHealth(project, tasks, today)
}

/** The health computed from dates and tasks alone, ignoring any override. */
export function automaticHealth(project: WorkProject, tasks: WorkTask[], today = todayIso()): ProjectHealth {
  if (project.status === WorkProjectStatus.COMPLETED || project.status === WorkProjectStatus.CANCELLED) {
    return ProjectHealth.DONE
  }
  if (project.dueDate && project.dueDate < today) return ProjectHealth.LATE
  if (tasks.some((t) => isTaskOverdue(t, today))) return ProjectHealth.AT_RISK

  if (project.dueDate) {
    const span = daysBetween(project.startDate, project.dueDate)
    const used = daysBetween(project.startDate, today)
    if (span > 0 && used > 0) {
      const timeUsed = Math.min(100, (used / span) * 100)
      if (taskProgress(tasks) + 20 < timeUsed) return ProjectHealth.AT_RISK
    }
  }
  return ProjectHealth.ON_TRACK
}

export enum MilestoneState {
  UPCOMING = "upcoming",
  OVERDUE = "overdue",
  AWAITING_APPROVAL = "awaiting_approval",
  REACHED = "reached",
}

/** A milestone is reached when its tasks are done and, if needed, the client approved it. */
export function milestoneState(milestone: Milestone, tasks: WorkTask[], today = todayIso()): MilestoneState {
  const own = tasks.filter((t) => t.milestoneId === milestone.id)
  const allDone = own.length > 0 && own.every((t) => t.status === TaskStatus.DONE)
  if (allDone) {
    if (!milestone.requiresApproval || milestone.approvedAt) return MilestoneState.REACHED
    return MilestoneState.AWAITING_APPROVAL
  }
  return milestone.dueDate < today ? MilestoneState.OVERDUE : MilestoneState.UPCOMING
}

/** Estimated hours left on unfinished tasks. */
export function remainingHours(tasks: WorkTask[]) {
  return tasks.filter((t) => t.status !== TaskStatus.DONE).reduce((sum, t) => sum + t.estimatedHours, 0)
}

/** Progress, health and task counts for every project, keyed by project id. */
export function projectStatsById(projects: WorkProject[], tasks: WorkTask[], today = todayIso()) {
  const byProject = new Map<string, WorkTask[]>()
  for (const task of tasks) {
    const list = byProject.get(task.projectId) ?? []
    list.push(task)
    byProject.set(task.projectId, list)
  }
  const stats = new Map<
    string,
    { progress: number; health: ProjectHealth; total: number; done: number; overdue: number }
  >()
  for (const project of projects) {
    const own = byProject.get(project.id) ?? []
    stats.set(project.id, {
      progress: taskProgress(own),
      health: projectHealth(project, own, today),
      total: own.length,
      done: own.filter((t) => t.status === TaskStatus.DONE).length,
      overdue: own.filter((t) => isTaskOverdue(t, today)).length,
    })
  }
  return stats
}
