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
  /** A fixed monthly amount covering some hours; extra hours at an overage rate (section 6.5) */
  RETAINER = "retainer",
}

export interface RetainerTerms {
  monthlyAmount: number
  includedHours: number
  overageRate: number
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
  /** Only for retainer projects */
  retainer?: RetainerTerms
  /** Manager's call on health when the automatic one is misleading; needs a reason (PRJ-10) */
  healthOverride?: HealthOverride
  /** Set when the project is closed (PRJ-13) */
  closedAt?: string
  /** Final figures frozen at closing */
  closeSnapshot?: CloseSnapshot
  /** Values of the workspace's custom fields (PLT-12) */
  customFields?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type WorkProjectInput = Omit<WorkProject, "id" | "workspaceId" | "createdAt" | "updatedAt">

/** Profitability frozen when a project is closed (PRJ-13). */
export interface CloseSnapshot {
  revenue: number
  laborCost: number
  expenses: number
  /** Overhead share at closing (CST-4); missing on projects closed before overheads existed */
  overhead?: number
  profit: number
  margin: number | null
  hours: number
  currency: string
  closedBy: string
  closedAt: string
}

/** Reusable project plan (PRJ-2): offsets are days from the project start. */
export interface ProjectTemplate {
  id: string
  workspaceId: string
  name: string
  description?: string
  budgetType: BudgetType
  durationDays: number
  milestones: { key: string; title: string; dueOffset: number; requiresApproval: boolean }[]
  tasks: {
    key: string
    title: string
    estimatedHours: number
    priority: Priority
    startOffset: number
    dueOffset: number
    milestoneKey?: string
    /** Keys of tasks that must finish first */
    dependsOn: string[]
  }[]
  createdAt: string
  updatedAt: string
}

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
  /** First day of work, for the Gantt (PLN-2); defaults from the due date and estimate */
  startDate?: string
  dueDate?: string
  /** Tasks that must be done before this one starts (finish-to-start, PRJ-6) */
  dependsOn?: string[]
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
  /** ISO timestamp of a client asking for changes instead (cleared by a later approval) */
  rejectedAt?: string
  /** The client's comment with the decision */
  decisionComment?: string
  /** Who decided, e.g. the portal contact's name */
  decidedBy?: string
  createdAt: string
  updatedAt: string
}

export type MilestoneInput = Omit<Milestone, "id" | "workspaceId" | "createdAt" | "updatedAt" | "approvedAt" | "rejectedAt" | "decisionComment" | "decidedBy">

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
