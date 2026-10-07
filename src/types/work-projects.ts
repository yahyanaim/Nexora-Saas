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
  /** How a fixed price is recognised as revenue (Phase 6g.5); "hours" when unset */
  recognitionMethod?: RecognitionMethod
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
  /** Phase budget (Phase 6g.4): hours and amount planned for the work under this milestone */
  budgetHours?: number
  budgetAmount?: number
  /** Share of a fixed price earned when this milestone is reached, in percent (Phase 6g.5) */
  revenueShare?: number
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

/** A change to the scope agreed with the client, adding to (or taking from) the budget (Phase 6g.4). */
export enum ChangeOrderStatus {
  DRAFT = "draft",
  SENT = "sent",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ChangeOrder {
  id: string
  workspaceId: string
  projectId: string
  /** Phase the change belongs to; the project as a whole when unset */
  milestoneId?: string
  /** CO-ORB-01-01, given when the change is created */
  number: string
  title: string
  description?: string
  /** Price change before VAT; negative when scope is removed */
  amount: number
  /** Hours added to (or removed from) the budget */
  hours: number
  status: ChangeOrderStatus
  sentAt?: string
  decidedAt?: string
  /** Who recorded the client's decision */
  decidedBy?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export type ChangeOrderInput = Pick<ChangeOrder, "projectId" | "title" | "amount" | "hours"> & Partial<Pick<ChangeOrder, "milestoneId" | "description">>

/**
 * Revenue recognition of a fixed price (Phase 6g.5):
 * hours = hours logged ÷ hours planned, tasks = share of the work done,
 * milestones = the share of each milestone once it is reached.
 */
export type RecognitionMethod = "hours" | "tasks" | "milestones"
export const RECOGNITION_METHODS: RecognitionMethod[] = ["hours", "tasks", "milestones"]
