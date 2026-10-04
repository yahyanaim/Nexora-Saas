import { describe, it, expect, beforeEach } from "vitest"
import {
  createDepartmentApi,
  deleteDepartmentApi,
  getSettingsApi,
  listDepartmentsApi,
  renameDepartmentApi,
  updateApprovalsApi,
  updateCompanyApi,
  updateListsApi,
} from "./settings-api"
import { ApprovalMode, ApprovalSubject } from "@/types/work-settings"

const WS = "ws_atlas"

beforeEach(() => localStorage.clear())

describe("company settings", () => {
  it("seeds per workspace and validates identifiers", async () => {
    const { company } = await getSettingsApi(WS)
    expect(company.ice).toHaveLength(15)
    await expect(updateCompanyApi(WS, { ...company, ice: "123" })).rejects.toThrow(/15 digits/)
    await expect(updateCompanyApi(WS, { ...company, invoiceNumberFormat: "INV-{YYYY}" })).rejects.toThrow(/\{SEQ\}/)
    await updateCompanyApi(WS, { ...company, legalName: "  Atlas SA  " })
    expect((await getSettingsApi(WS)).company.legalName).toBe("Atlas SA")
  })
})

describe("approval rules", () => {
  it("keeps an amount only on two-step money rules", async () => {
    const saved = await updateApprovalsApi(WS, [
      { subject: ApprovalSubject.LEAVE, mode: ApprovalMode.ONE_STEP, secondStepAbove: 100 },
      { subject: ApprovalSubject.EXPENSE, mode: ApprovalMode.TWO_STEP, secondStepAbove: 300 },
    ])
    expect(saved.approvals[0]!.secondStepAbove).toBeUndefined()
    expect(saved.approvals[1]!.secondStepAbove).toBe(300)
  })
})

describe("lists", () => {
  it("rejects turning everything off and duplicate labels", async () => {
    const s = await getSettingsApi(WS)
    const base = { leaveTypes: s.leaveTypes, expenseCategories: s.expenseCategories, taskLabels: s.taskLabels, receiptRequiredAbove: 25 }
    await expect(updateListsApi(WS, { ...base, leaveTypes: s.leaveTypes.map((l) => ({ ...l, enabled: false })) })).rejects.toThrow()
    await expect(updateListsApi(WS, { ...base, taskLabels: [{ id: "a", name: "Bug" }, { id: "b", name: "bug " }] })).rejects.toThrow(/same name/)
  })
})

describe("departments", () => {
  it("creates, renames and only deletes empty departments", async () => {
    const dep = await createDepartmentApi(WS, "Legal")
    await expect(createDepartmentApi(WS, "legal")).rejects.toThrow(/already exists/)
    await renameDepartmentApi(WS, dep.id, "Legal & Compliance")
    await expect(deleteDepartmentApi(WS, dep.id, [dep.id])).rejects.toThrow(/Move its people/)
    await deleteDepartmentApi(WS, dep.id, [])
    expect((await listDepartmentsApi(WS)).some((d) => d.id === dep.id)).toBe(false)
  })
})

describe("settings drive the forms' rules", () => {
  it("blocks disabled leave types and expense categories, and requires receipts above the limit", async () => {
    const { requestLeaveApi } = await import("./leave-api")
    const { submitExpenseApi } = await import("./expenses-api")
    const { LeaveType } = await import("@/types/work-planning")
    const { ExpenseCategory } = await import("@/types/work-costs")
    const s = await getSettingsApi(WS)
    await updateListsApi(WS, {
      leaveTypes: s.leaveTypes.map((l) => ({ ...l, enabled: l.type !== LeaveType.UNPAID })),
      expenseCategories: s.expenseCategories.map((c) => ({ ...c, enabled: c.category !== ExpenseCategory.MEALS })),
      taskLabels: s.taskLabels,
      receiptRequiredAbove: 50,
    })
    await expect(
      requestLeaveApi(WS, { employeeId: "emp_lina", type: LeaveType.UNPAID, startDate: "2030-03-04", endDate: "2030-03-05" })
    ).rejects.toThrow(/turned off/)
    const expense = { employeeId: "emp_lina", date: "2026-01-12", description: "Lunch", amount: 40, billable: false }
    await expect(submitExpenseApi(WS, { ...expense, category: ExpenseCategory.MEALS })).rejects.toThrow(/turned off/)
    await expect(submitExpenseApi(WS, { ...expense, category: ExpenseCategory.TRAVEL, amount: 80 })).rejects.toThrow(/receipt/)
    await expect(submitExpenseApi(WS, { ...expense, category: ExpenseCategory.TRAVEL, amount: 80, receiptName: "r.pdf" })).resolves.toBeTruthy()
  })
})
