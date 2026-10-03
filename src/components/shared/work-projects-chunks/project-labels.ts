import {
  BudgetType,
  Priority,
  ProjectHealth,
  TaskStatus,
  WorkProjectStatus,
} from "@/types/work-projects"
import { MilestoneState } from "@/lib/workforce/project-metrics"

/** Translation keys and badge styles for project enums, shared by every project screen. */

export const PROJECT_STATUS_LABEL: Record<WorkProjectStatus, string> = {
  [WorkProjectStatus.PLANNING]: "planning",
  [WorkProjectStatus.ACTIVE]: "active",
  [WorkProjectStatus.ON_HOLD]: "onHold",
  [WorkProjectStatus.COMPLETED]: "completed",
  [WorkProjectStatus.CANCELLED]: "cancelled",
}

export const PROJECT_STATUS_CLASS: Record<WorkProjectStatus, string> = {
  [WorkProjectStatus.PLANNING]: "bg-info-soft text-info-foreground border-transparent",
  [WorkProjectStatus.ACTIVE]: "bg-success-soft text-success-foreground border-transparent",
  [WorkProjectStatus.ON_HOLD]: "bg-warning-soft text-warning-foreground border-transparent",
  [WorkProjectStatus.COMPLETED]: "bg-muted text-foreground border-transparent",
  [WorkProjectStatus.CANCELLED]: "bg-muted text-muted-foreground border-transparent line-through",
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.LOW]: "priorityLow",
  [Priority.MEDIUM]: "priorityMedium",
  [Priority.HIGH]: "priorityHigh",
  [Priority.URGENT]: "priorityUrgent",
}

/** Dot color per priority; the label always sits next to it */
export const PRIORITY_DOT: Record<Priority, string> = {
  [Priority.LOW]: "bg-muted-foreground/40",
  [Priority.MEDIUM]: "bg-info-foreground",
  [Priority.HIGH]: "bg-warning-foreground",
  [Priority.URGENT]: "bg-destructive",
}

export const BUDGET_TYPE_LABEL: Record<BudgetType, string> = {
  [BudgetType.FIXED]: "fixedPrice",
  [BudgetType.HOURLY]: "hourlyBilling",
  [BudgetType.NON_BILLABLE]: "nonBillable",
}

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  [ProjectHealth.ON_TRACK]: "onTrack",
  [ProjectHealth.AT_RISK]: "atRisk",
  [ProjectHealth.LATE]: "late",
  [ProjectHealth.DONE]: "finished",
}

export const HEALTH_CLASS: Record<ProjectHealth, string> = {
  [ProjectHealth.ON_TRACK]: "bg-success-soft text-success-foreground border-transparent",
  [ProjectHealth.AT_RISK]: "bg-warning-soft text-warning-foreground border-transparent",
  [ProjectHealth.LATE]: "bg-danger-soft text-destructive border-transparent",
  [ProjectHealth.DONE]: "bg-muted text-muted-foreground border-transparent",
}

/** Progress bar color follows health so the bar and badge agree */
export const HEALTH_BAR: Record<ProjectHealth, string> = {
  [ProjectHealth.ON_TRACK]: "[&>[data-slot=progress-indicator]]:bg-primary",
  [ProjectHealth.AT_RISK]: "[&>[data-slot=progress-indicator]]:bg-warning-foreground",
  [ProjectHealth.LATE]: "[&>[data-slot=progress-indicator]]:bg-destructive",
  [ProjectHealth.DONE]: "[&>[data-slot=progress-indicator]]:bg-success-foreground",
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "toDo",
  [TaskStatus.IN_PROGRESS]: "inProgress",
  [TaskStatus.REVIEW]: "inReview",
  [TaskStatus.DONE]: "done",
}

export const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "bg-muted-foreground/40",
  [TaskStatus.IN_PROGRESS]: "bg-info-foreground",
  [TaskStatus.REVIEW]: "bg-warning-foreground",
  [TaskStatus.DONE]: "bg-success-foreground",
}

export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = {
  [MilestoneState.UPCOMING]: "upcoming",
  [MilestoneState.OVERDUE]: "overdue",
  [MilestoneState.AWAITING_APPROVAL]: "awaitingApproval",
  [MilestoneState.REACHED]: "reached",
}

export const MILESTONE_STATE_CLASS: Record<MilestoneState, string> = {
  [MilestoneState.UPCOMING]: "bg-info-soft text-info-foreground border-transparent",
  [MilestoneState.OVERDUE]: "bg-danger-soft text-destructive border-transparent",
  [MilestoneState.AWAITING_APPROVAL]: "bg-warning-soft text-warning-foreground border-transparent",
  [MilestoneState.REACHED]: "bg-success-soft text-success-foreground border-transparent",
}

/** Short date like "12 Oct" (adds the year when it differs from this year). */
export function formatShortDate(iso: string | undefined, locale?: string) {
  if (!iso) return "—"
  const date = new Date(`${iso}T00:00:00`)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date)
}
