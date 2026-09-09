// types/reports.ts

export enum ReportStatus {
  PENDING = "pending",
  REVIEWING = "reviewing",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

// Report types for Volix SaaS Starter
export enum ReportType {
  USER = "user",
  PROJECT = "project",
  FILE = "file",
  SUBSCRIPTION = "subscription",
  TRANSACTION = "transaction",
  INVOICE = "invoice",
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = "inappropriate_content",
  SPAM = "spam",
  FRAUD = "fraud",
  COPYRIGHT = "copyright",
  HARASSMENT = "harassment",
  IMPERSONATION = "impersonation",
  OTHER = "other",
}

export interface ContentReport {
  id: string
  reporterId: string
  reporterName: string
  reporterAvatar?: string
  targetId: string
  targetName: string
  targetAvatar?: string
  targetType: ReportType
  reason: ReportReason
  description?: string
  status: ReportStatus
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  actionTaken?: string
  createdAt: string
  updatedAt: string
}

export interface ContentReportStats {
  total: number
  pending: number
  reviewing: number
  resolved: number
  dismissed: number
}

// System Issues
export enum IssueStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum IssueCategory {
  PERFORMANCE = "performance",
  SECURITY = "security",
  BUG = "bug",
  FEATURE = "feature",
  DEPLOYMENT = "deployment",
  DATABASE = "database",
  API = "api",
  UI_UX = "ui_ux",
  OTHER = "other",
}

export interface SystemIssue {
  id: string
  title: string
  description: string
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  assignedTo?: string
  assignedToName?: string
  assignedToAvatar?: string
  reportedBy: string
  reportedByName: string
  reportedByAvatar?: string
  resolvedAt?: string
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface SystemIssueStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
}
