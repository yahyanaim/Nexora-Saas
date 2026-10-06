import { ExpenseStatus, type Expense } from "@/types/work-costs"
import { TimeEntryStatus, type ClientInvoice, type TimeEntry } from "@/types/work-billing"
import { LeaveStatus, type LeaveRequest } from "@/types/work-planning"
import { TaskStatus, type WorkTask } from "@/types/work-projects"
import type { EmployeeDocument } from "@/types/work-hr"
import type { PerformanceReview } from "@/types/work-reviews"
import { EmployeeStatus, type Employee } from "@/types/workforce"
import { displayStatus } from "./billing"
import { documentsNeedingAction } from "./documents"
import { reviewAction, type ReviewViewer } from "./reviews"

export type InboxCategory = "team" | "billing" | "security" | "system"

/** Something the signed-in person should act on, with where to do it. */
export interface InboxItem {
  /** Changes when the content changes, so a new item shows as unread again */
  id: string
  category: InboxCategory
  /** Translation key and values for the title and message */
  title: string
  message: string
  values: Record<string, string | number>
  href: string
}

export interface InboxInput {
  viewer: ReviewViewer
  rights: { approveTime: boolean; invoices: boolean; hr: boolean }
  employees: Employee[]
  reviews: PerformanceReview[]
  entries: TimeEntry[]
  leave: LeaveRequest[]
  expenses: Expense[]
  invoices: ClientInvoice[]
  documents: EmployeeDocument[]
  tasks: WorkTask[]
  today: string
}

/**
 * The work inbox behind the bell: reviews waiting for the person, approvals
 * waiting for approvers, overdue invoices for finance, expiring documents for
 * HR and the person's own overdue tasks. Approvers never see their own items.
 */
export function buildInbox(d: InboxInput): InboxItem[] {
  const me = d.viewer.employeeId
  const name = (id: string) => d.employees.find((e) => e.id === id)?.name ?? "—"
  const items: InboxItem[] = []

  for (const r of d.reviews) {
    const action = reviewAction(r, d.viewer)
    if (!action) continue
    items.push({
      id: `review:${r.id}:${action}`,
      category: "team",
      title: `inboxReview_${action}`,
      message: "inboxReviewMessage",
      values: { name: name(r.employeeId), period: r.period },
      href: "/dashboard/reviews",
    })
  }

  if (d.rights.approveTime) {
    const mine = (by?: string) => !!by && by === (me ?? (d.viewer.isAdmin ? "admin" : ""))
    const sheets = d.entries.filter((e) => e.status === TimeEntryStatus.SUBMITTED && e.employeeId !== me && !mine(e.firstApprovedBy))
    const people = new Set(sheets.map((e) => e.employeeId)).size
    if (sheets.length) items.push({ id: `time:${sheets.length}`, category: "team", title: "inboxTimesheets", message: "inboxTimesheetsMessage", values: { count: people, hours: sheets.reduce((s, e) => s + e.hours, 0) }, href: "/dashboard/time-approvals" })
    const leave = d.leave.filter((l) => l.status === LeaveStatus.PENDING && l.employeeId !== me && !mine(l.firstApprovedBy))
    if (leave.length) items.push({ id: `leave:${leave.map((l) => l.id).join(",")}`, category: "team", title: "inboxLeave", message: "inboxLeaveMessage", values: { count: leave.length }, href: "/dashboard/leave" })
    const expenses = d.expenses.filter((x) => x.status === ExpenseStatus.SUBMITTED && x.employeeId !== me && !mine(x.firstApprovedBy))
    if (expenses.length) items.push({ id: `expenses:${expenses.map((x) => x.id).join(",")}`, category: "billing", title: "inboxExpenses", message: "inboxExpensesMessage", values: { count: expenses.length }, href: "/dashboard/expenses" })
  }

  if (d.rights.invoices) {
    const overdue = d.invoices.filter((i) => displayStatus(i, d.today, d.invoices) === "overdue")
    if (overdue.length) items.push({ id: `overdue:${overdue.map((i) => i.id).join(",")}`, category: "billing", title: "inboxOverdue", message: "inboxOverdueMessage", values: { count: overdue.length }, href: "/dashboard/receivables" })
  }

  if (d.rights.hr) {
    const staff = d.employees.filter((e) => e.status !== EmployeeStatus.INACTIVE).map((e) => e.id)
    const docs = documentsNeedingAction(d.documents, staff, d.today)
    if (docs.length) items.push({ id: `docs:${docs.map((x) => `${x.doc.id}-${x.status}`).join(",")}`, category: "security", title: "inboxDocuments", message: "inboxDocumentsMessage", values: { count: docs.length }, href: "/dashboard/documents" })
  }

  if (me) {
    const late = d.tasks.filter((t) => t.assigneeId === me && t.status !== TaskStatus.DONE && t.dueDate && t.dueDate < d.today)
    if (late.length) items.push({ id: `tasks:${late.map((t) => t.id).join(",")}`, category: "system", title: "inboxTasks", message: "inboxTasksMessage", values: { count: late.length }, href: "/dashboard/my-work" })
  }
  return items
}
