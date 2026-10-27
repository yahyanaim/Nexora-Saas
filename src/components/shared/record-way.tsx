"use client"

import { useLocale, useTranslations } from "next-intl"
import { NodeProgress, type NodeStep } from "@/components/ui/nexus"
import { Ban, CheckCircle2, Clock, DollarSign, FileText, Flag, HandCoins, Handshake, Pencil, Receipt, Send, Upload, User } from "@/components/ui/carbon/icons"
import { billWay, expenseWay, invoiceWay, leaveWay, milestoneWay, quoteWay, timesheetWay, type RecordStep } from "@/lib/workforce/record-steps"
import { todayIso } from "@/lib/workforce/project-metrics"
import type { ClientInvoice } from "@/types/work-billing"
import type { Quote, QuoteDisplayStatus } from "@/types/work-quotes"
import type { Milestone, WorkTask } from "@/types/work-projects"
import type { LeaveRequest } from "@/types/work-planning"
import type { Expense } from "@/types/work-costs"
import type { SupplierBill } from "@/types/work-purchases"
import type { TimeEntry } from "@/types/work-billing"
import { formatMoney } from "./workforce-chunks/workforce-labels"
import { formatShortDate } from "./work-projects-chunks/project-labels"

/*
 * Node progress for each kind of record (DS-07): the steps come from
 * record-steps.ts, this file gives them words, icons, dates and hover details.
 */

function useStepText() {
  const t = useTranslations()
  const locale = useLocale()
  const short = (iso?: string) => (iso ? formatShortDate(iso.slice(0, 10), locale) : undefined)
  const long = (iso?: string) => {
    if (!iso) return undefined
    const hasTime = iso.length > 10
    const d = new Date(hasTime ? iso : `${iso}T00:00:00`)
    return new Intl.DateTimeFormat(locale, hasTime ? { dateStyle: "full", timeStyle: "short" } : { dateStyle: "full" }).format(d)
  }
  const stateLabels = {
    done: t("npStateDone"),
    current: t("npStateCurrent"),
    late: t("npStateLate"),
    todo: t("npStateTodo"),
    stopped: t("npStateStopped"),
  }
  /** Shared wording: date under the label, late / days-left hint, full date on hover. */
  const base = (s: RecordStep, label: string): NodeStep => ({
    label,
    state: s.state,
    date: s.state === "todo" || s.state === "current" || s.state === "late" ? (s.at ? t("npDue", { date: short(s.at)! }) : undefined) : short(s.at),
    hint: s.lateDays !== undefined ? t("npDaysLate", { count: s.lateDays }) : s.daysLeft !== undefined ? t("npDaysLeft", { count: s.daysLeft }) : undefined,
    detail: s.at && (s.state === "done" || s.state === "stopped") ? `${label} · ${long(s.at)}` : undefined,
    reach: s.reach,
  })
  return { t, locale, short, long, base, stateLabels }
}

const INVOICE_ICONS = { draft: Pencil, issued: FileText, sent: Send, paid: DollarSign, cancelled: Ban }
const INVOICE_LABELS = { draft: "draft", issued: "issued", sent: "sent", paid: "paid", cancelled: "cancelled" }

/** Draft → issued → sent → paid, with part payments filling the last line. */
export function InvoiceWay({ invoice, className }: { invoice: ClientInvoice; className?: string }) {
  const { t, locale, base, short, stateLabels } = useStepText()
  const steps = invoiceWay(invoice, todayIso()).map((s) => {
    const step = base(s, t(INVOICE_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : INVOICE_ICONS[s.key]
    if (s.paid !== undefined && s.total !== undefined) {
      const money = (n: number) => formatMoney(n, invoice.currency, locale)
      step.hint = s.lateDays !== undefined ? step.hint : t("npPaidOf", { paid: money(s.paid), total: money(s.total) })
      step.detail = (invoice.payments ?? []).map((p) => `${short(p.date)} · ${money(p.amount)}`).join("\n")
    }
    return step
  })
  return <NodeProgress label={t("npInvoiceWay")} steps={steps} stateLabels={stateLabels} className={className} />
}

const QUOTE_ICONS = { draft: Pencil, sent: Send, accepted: Handshake, invoiced: Receipt, declined: Ban, expired: Ban }
const QUOTE_LABELS = { draft: "draft", sent: "quoteSent", accepted: "quoteAccepted", invoiced: "quoteInvoiced", declined: "quoteDeclined", expired: "quoteExpired" }

/** Draft → sent → accepted → invoiced; the answer step counts down the days left. */
export function QuoteWay({ quote, status, invoicedAt, className }: { quote: Quote; status: QuoteDisplayStatus; invoicedAt?: string; className?: string }) {
  const { t, base, stateLabels } = useStepText()
  const steps = quoteWay(quote, status, todayIso(), invoicedAt).map((s) => {
    const step = base(s, t(QUOTE_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : QUOTE_ICONS[s.key]
    return step
  })
  return <NodeProgress label={t("npQuoteWay")} steps={steps} stateLabels={stateLabels} className={className} />
}

/** The project's milestones on one line, in date order. */
export function MilestoneWay({ milestones, tasks, className }: { milestones: Milestone[]; tasks: WorkTask[]; className?: string }) {
  const { t, base, long, stateLabels } = useStepText()
  if (milestones.length === 0) return null
  const steps = milestoneWay(milestones, tasks, todayIso()).map((s) => {
    const m = s.milestone
    const step = base(s, m.title)
    step.icon = s.state === "done" ? undefined : Flag
    if (s.awaitingClient) step.hint = t("npAwaitingClient")
    const lines = [`${m.title} · ${long(m.dueDate)}`]
    if (m.requiresApproval) lines.push(m.approvedAt && m.decidedBy ? t("npApprovedBy", { name: m.decidedBy }) : t("npNeedsSignOff"))
    step.detail = lines.join("\n")
    return step
  })
  return <NodeProgress label={t("npMilestoneWay")} steps={steps} stateLabels={stateLabels} className={className} />
}

const LEAVE_ICONS = { asked: User, firstApproval: CheckCircle2, approved: CheckCircle2, rejected: Ban, cancelled: Ban }
const LEAVE_LABELS = { asked: "npAsked", firstApproval: "npFirstApproval", approved: "approved", rejected: "declined", cancelled: "cancelled" }

/** Asked → (first approval) → approved, or declined / cancelled. */
export function LeaveWay({ request, steps: approvalSteps, className }: { request: LeaveRequest; steps: number; className?: string }) {
  const { t, base, stateLabels } = useStepText()
  const steps = leaveWay(request, approvalSteps).map((s) => {
    const step = base(s, t(LEAVE_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : LEAVE_ICONS[s.key]
    return step
  })
  return <NodeProgress label={t("npLeaveWay")} steps={steps} stateLabels={stateLabels} className={className} />
}

const EXPENSE_ICONS = { submitted: Upload, firstApproval: CheckCircle2, approved: CheckCircle2, reimbursed: HandCoins, rejected: Ban }
const EXPENSE_LABELS = { submitted: "submitted", firstApproval: "npFirstApproval", approved: "approved", reimbursed: "reimbursed", rejected: "declined" }

/** Submitted → (first approval) → approved → paid back, or declined. Compact in the expenses table. */
export function ExpenseWay({ expense, steps: approvalSteps, compact, className }: { expense: Expense; steps: number; compact?: boolean; className?: string }) {
  const { t, base, stateLabels } = useStepText()
  const steps = expenseWay(expense, approvalSteps).map((s) => {
    const step = base(s, t(EXPENSE_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : EXPENSE_ICONS[s.key]
    if (s.key === "rejected" && expense.rejectionReason) step.detail = [step.detail, expense.rejectionReason].filter(Boolean).join("\n")
    return step
  })
  return <NodeProgress label={t("npExpenseWay")} steps={steps} stateLabels={stateLabels} compact={compact} className={className} />
}

const BILL_ICONS = { entered: FileText, approved: CheckCircle2, paid: DollarSign, rejected: Ban }
const BILL_LABELS = { entered: "npReceived", approved: "approved", paid: "paid", rejected: "declined" }

/** Received → approved → paid, part payments filling the last line, late past the due date. */
export function BillWay({ bill, currency, compact, className }: { bill: SupplierBill; currency: string; compact?: boolean; className?: string }) {
  const { t, locale, base, short, stateLabels } = useStepText()
  const steps = billWay(bill, todayIso()).map((s) => {
    const step = base(s, t(BILL_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : BILL_ICONS[s.key]
    if (s.paid !== undefined && s.total !== undefined) {
      const money = (n: number) => formatMoney(n, currency, locale)
      step.hint = s.lateDays !== undefined ? step.hint : t("npPaidOf", { paid: money(s.paid), total: money(s.total) })
      step.detail = bill.payments.map((p) => `${short(p.date)} · ${money(p.amount)}`).join("\n")
    }
    if (s.key === "rejected" && bill.rejectionReason) step.detail = [step.detail, bill.rejectionReason].filter(Boolean).join("\n")
    return step
  })
  return <NodeProgress label={t("npBillWay")} steps={steps} stateLabels={stateLabels} compact={compact} className={className} />
}

const TIMESHEET_ICONS = { submitted: Clock, firstApproval: CheckCircle2, approved: CheckCircle2, invoiced: Receipt }
const TIMESHEET_LABELS = { submitted: "submitted", firstApproval: "npFirstApproval", approved: "approved", invoiced: "invoiced" }

/** A week of hours: submitted → (first approval) → approved → invoiced. */
export function TimesheetWay({ entries, steps: approvalSteps, className }: { entries: TimeEntry[]; steps: number; className?: string }) {
  const { t, base, stateLabels } = useStepText()
  const steps = timesheetWay(entries, approvalSteps).map((s) => {
    const step = base(s, t(TIMESHEET_LABELS[s.key]))
    step.icon = s.state === "done" ? undefined : TIMESHEET_ICONS[s.key]
    return step
  })
  return <NodeProgress label={t("npTimesheetWay")} steps={steps} stateLabels={stateLabels} className={className} />
}
