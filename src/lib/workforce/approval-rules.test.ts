import { describe, it, expect } from "vitest"
import { approvalDecision } from "./approvals"
import { ApprovalMode, ApprovalSubject, type ApprovalRule } from "@/types/work-settings"
import { reviewExpenseApi, submitExpenseApi } from "@/lib/api/expenses-api"
import { approveTimeEntriesApi, rejectTimeEntriesApi, setTimesheetCellApi, submitTimesheetApi } from "@/lib/api/work-billing-api"
import { decideLeaveApi, requestLeaveApi } from "@/lib/api/leave-api"
import { updateApprovalsApi } from "@/lib/api/settings-api"
import { ExpenseCategory, ExpenseStatus } from "@/types/work-costs"
import { LeaveStatus, LeaveType } from "@/types/work-planning"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"

const rules: ApprovalRule[] = [
  { subject: ApprovalSubject.TIMESHEET, mode: ApprovalMode.ONE_STEP },
  { subject: ApprovalSubject.EXPENSE, mode: ApprovalMode.TWO_STEP, secondStepAbove: 500 },
  { subject: ApprovalSubject.LEAVE, mode: ApprovalMode.TWO_STEP },
]

describe("approvalDecision", () => {
  it("refuses your own request, admins included", () => {
    expect(() => approvalDecision({ rules, subject: ApprovalSubject.TIMESHEET, submitterId: "a", approver: { employeeId: "a", isAdmin: true } })).toThrow(/own/)
  })
  it("needs a second, different person above the two-step amount", () => {
    const base = { rules, subject: ApprovalSubject.EXPENSE, submitterId: "dev" }
    expect(approvalDecision({ ...base, amount: 200, approver: { employeeId: "lead", isAdmin: false } })).toBe("approved")
    expect(approvalDecision({ ...base, amount: 900, approver: { employeeId: "lead", isAdmin: false } })).toBe("first_step")
    expect(() => approvalDecision({ ...base, amount: 900, approver: { employeeId: "lead", isAdmin: false }, firstApprovedBy: "lead" })).toThrow(/someone else/)
    expect(approvalDecision({ ...base, amount: 900, approver: { employeeId: "boss", isAdmin: true }, firstApprovedBy: "lead" })).toBe("approved")
  })
})

describe("approval rules in the API", () => {
  const WS = "ws_atlas"
  const lead = { employeeId: "emp_karim", isAdmin: false }
  const boss = { employeeId: "emp_sara", isAdmin: true }
  const lina = { employeeId: "emp_lina", isAdmin: false }

  it("refuses to approve or reject your own hours and records the approver", async () => {
    const e = (await setTimesheetCellApi(WS, { employeeId: "emp_karim", projectId: "prj_helio", date: "2026-07-06", hours: 0.25 })) as TimeEntry
    await submitTimesheetApi(WS, "emp_karim", "2026-07-06", "2026-07-06")
    await expect(approveTimeEntriesApi(WS, lead, [e.id])).rejects.toThrow(/own/)
    await expect(rejectTimeEntriesApi(WS, lead, [e.id], "no")).rejects.toThrow(/own/)
    expect(await approveTimeEntriesApi(WS, boss, [e.id])).toBe(1)
  })

  it("takes two people for an expense above the threshold", async () => {
    const x = await submitExpenseApi(WS, { employeeId: "emp_lina", date: "2026-09-10", amount: 800, category: ExpenseCategory.TRAVEL, description: "Flight", billable: false, receiptName: "r.pdf" })
    await expect(reviewExpenseApi(WS, lina, x.id, true)).rejects.toThrow(/own/)
    const first = await reviewExpenseApi(WS, lead, x.id, true)
    expect(first.status).toBe(ExpenseStatus.SUBMITTED)
    expect(first.firstApprovedBy).toBe("emp_karim")
    await expect(reviewExpenseApi(WS, lead, x.id, true)).rejects.toThrow(/someone else/)
    const done = await reviewExpenseApi(WS, boss, x.id, true)
    expect(done.status).toBe(ExpenseStatus.APPROVED)
    expect(done.approvedBy).toBe("emp_sara")
  })

  it("approves on submission when the workspace needs no approval", async () => {
    await updateApprovalsApi(WS, [
      { subject: ApprovalSubject.TIMESHEET, mode: ApprovalMode.NONE },
      { subject: ApprovalSubject.LEAVE, mode: ApprovalMode.NONE },
      { subject: ApprovalSubject.EXPENSE, mode: ApprovalMode.ONE_STEP },
      { subject: ApprovalSubject.QUOTE, mode: ApprovalMode.NONE },
      { subject: ApprovalSubject.INVOICE, mode: ApprovalMode.NONE },
    ])
    const r = await requestLeaveApi(WS, { employeeId: "emp_lina", type: LeaveType.PERSONAL, startDate: "2030-06-03", endDate: "2030-06-03" })
    expect(r.status).toBe(LeaveStatus.APPROVED)
    expect(r.approvedBy).toBe("auto")
    await expect(decideLeaveApi(WS, boss, r.id, true)).rejects.toThrow(/pending/)
    const e = (await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_helio", date: "2026-07-07", hours: 0.25 })) as TimeEntry
    await submitTimesheetApi(WS, "emp_lina", "2026-07-07", "2026-07-07")
    const { listTimeEntriesApi } = await import("@/lib/api/work-billing-api")
    const after = (await listTimeEntriesApi(WS)).find((x) => x.id === e.id)!
    expect(after.status).toBe(TimeEntryStatus.APPROVED)
    expect(after.billRate).toBeGreaterThan(0)
  })
})
