/** Projects a workspace runs for its clients, with their tasks and milestones. */

export enum WorkProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum BudgetType {
  /** One agreed price for the whole project */
  FIXED = "fixed",
  /** Billed from the hours worked */
  HOURLY = "hourly",
  /** Internal work, never invoiced */
  NON_BILLABLE = "non_billable",
}

export interface WorkProject {
  id: string
  workspaceId: string
  /** Short reference shown on boards and invoices, e.g. "ORB-01" */
  code: string
  name: string
  description?: string
  clientId?: string
  managerId?: string
  memberIds: string[]
  status: WorkProjectStatus
  priority: Priority
  /** ISO dates (yyyy-mm-dd) */
  startDate: string
  dueDate?: string
  budgetType: BudgetType
  /** Fixed price, or the hourly budget cap, in the workspace currency */
  budgetAmount?: number
  /** Manager's call on health when the automatic one is misleading; needs a reason (PRJ-10) */
  healthOverride?: HealthOverride
  createdAt: string
  updatedAt: string
}

export type WorkProjectInput = Omit<WorkProject, "id" | "workspaceId" | "createdAt" | "updatedAt">

export interface HealthOverride {
  health: ProjectHealth
  reason: string
  setBy: string
  /** ISO timestamp */
  setAt: string
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done",
}

export const TASK_STATUSES = Object.values(TaskStatus)

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface WorkTask {
  id: string
  workspaceId: string
  projectId: string
  milestoneId?: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  assigneeId?: string
  dueDate?: string
  estimatedHours: number
  /** Position inside its status column */
  order: number
  subtasks: Subtask[]
  /** Workspace task labels (settings) */
  labelIds?: string[]
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type WorkTaskInput = Omit<
  WorkTask,
  "id" | "workspaceId" | "createdAt" | "updatedAt" | "order" | "completedAt"
>

export interface Milestone {
  id: string
  workspaceId: string
  projectId: string
  title: string
  dueDate: string
  /** The client must sign off before the milestone counts as reached */
  requiresApproval: boolean
  /** ISO timestamp of the client sign-off */
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export type MilestoneInput = Omit<Milestone, "id" | "workspaceId" | "createdAt" | "updatedAt" | "approvedAt">

/** A comment on a task; @mentions are resolved to employee ids (PRJ-7). */
export interface TaskComment {
  id: string
  workspaceId: string
  taskId: string
  authorName: string
  body: string
  mentionIds: string[]
  createdAt: string
  updatedAt: string
}

/** One change in a task's history, written automatically. */
export interface TaskActivity {
  id: string
  workspaceId: string
  taskId: string
  actorName: string
  /** Translation key of what happened */
  kind: "created" | "status" | "assignee" | "due" | "estimate" | "title" | "labels"
  from?: string
  to?: string
  createdAt: string
  updatedAt: string
}

export enum ProjectHealth {
  ON_TRACK = "on_track",
  AT_RISK = "at_risk",
  LATE = "late",
  DONE = "done",
}
