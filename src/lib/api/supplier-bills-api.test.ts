import { describe, it, expect, beforeEach } from "vitest"
import { createSupplierBillApi, deleteSupplierBillApi, listSupplierBillsApi, paySupplierBillApi, reviewSupplierBillApi, updateSupplierBillApi } from "./supplier-bills-api"
import { deleteSupplierApi } from "./suppliers-api"
import { billDisplayStatus, billTotals, projectBillCost } from "@/lib/workforce/supplier-bills"
import { billVatLines } from "@/lib/workforce/vat"
import { DEFAULT_ACCOUNTS, buildJournal } from "@/lib/workforce/journal"
import { SupplierBillStatus, SupplierCategory } from "@/types/work-purchases"

const WS = "ws_atlas"
const input = {
  supplierId: "sup_dev", number: "YA-099", issueDate: "2030-03-01", dueDate: "2030-03-16", projectId: "prj_helio", taxRate: 20,
  lines: [{ id: "l1", description: "API work", quantity: 2, unitPrice: 1000 }, { id: "l2", description: "Training", quantity: 1, unitPrice: 500, taxRate: 10 }],
}

describe("supplier bills (Phase 6f.2)", () => {
  beforeEach(() => localStorage.clear())

  it("totals lines with their own VAT rates", () => {
    expect(billTotals(input)).toMatchObject({ subtotal: 2500, tax: 450, total: 2950, balance: 2950 })
  })

  it("goes through approval by someone else, then payment", async () => {
    const bill = await createSupplierBillApi(WS, input, "emp_yassine")
    expect(bill.status).toBe(SupplierBillStatus.SUBMITTED)
    await expect(createSupplierBillApi(WS, { ...input, number: " ya-099 " }, "emp_yassine")).rejects.toThrow(/already recorded/)
    await expect(paySupplierBillApi(WS, bill.id, { date: "2030-03-05", amount: 100, method: "cash" })).rejects.toThrow(/Approve/)
    await expect(reviewSupplierBillApi(WS, { employeeId: "emp_yassine", isAdmin: false }, bill.id, true)).rejects.toThrow(/own request/)
    await expect(reviewSupplierBillApi(WS, { employeeId: "emp_sara", isAdmin: true }, bill.id, false)).rejects.toThrow(/reason/)
    await reviewSupplierBillApi(WS, { employeeId: "emp_sara", isAdmin: true }, bill.id, true)
    await expect(updateSupplierBillApi(WS, bill.id, input)).rejects.toThrow(/can't be changed/)
    await expect(deleteSupplierBillApi(WS, bill.id)).rejects.toThrow(/can't be deleted/)
    await expect(paySupplierBillApi(WS, bill.id, { date: "2030-03-10", amount: 5000, method: "bank_transfer" })).rejects.toThrow(/more than/)
    const part = await paySupplierBillApi(WS, bill.id, { date: "2030-03-10", amount: 1000, method: "bank_transfer" })
    expect(billDisplayStatus(part, "2030-03-11")).toBe("partially_paid")
    expect(billDisplayStatus(part, "2030-03-20")).toBe("overdue")
    expect((await paySupplierBillApi(WS, bill.id, { date: "2030-03-12", amount: 1950, method: "cheque" })).status).toBe(SupplierBillStatus.PAID)
  })

  it("checks dates and lines, and keeps suppliers with bills", async () => {
    await expect(createSupplierBillApi(WS, { ...input, dueDate: "2030-02-01" }, "x")).rejects.toThrow(/due date/)
    await expect(createSupplierBillApi(WS, { ...input, lines: [] }, "x")).rejects.toThrow(/at least one line/)
    await expect(deleteSupplierApi(WS, "sup_cloud")).rejects.toThrow(/only be archived/)
  })

  it("feeds project cost, deductible VAT and the purchases journal", async () => {
    const all = await listSupplierBillsApi(WS)
    // The approved subcontracting bill on the Orbit project counts before VAT; the one still waiting does not
    expect(projectBillCost(all, "prj_orbit")).toBe(28000)
    expect(projectBillCost(all, "prj_helio")).toBe(0)

    const approved = { ...input, id: "b", workspaceId: WS, status: SupplierBillStatus.APPROVED, submittedBy: "x", createdAt: "", updatedAt: "", payments: [{ id: "p", date: "2030-03-10", amount: 1475, method: "bank_transfer" as const }] }
    expect(billVatLines([approved], "invoice").map((l) => [l.date, l.rate, l.vat])).toEqual([["2030-03-01", 20, 400], ["2030-03-01", 10, 50]])
    // Half paid: half the VAT is deductible, on the payment date
    expect(billVatLines([approved], "payment").map((l) => [l.date, l.vat])).toEqual([["2030-03-10", 200], ["2030-03-10", 25]])

    const lines = buildJournal([], [], DEFAULT_ACCOUNTS, { client: () => "", employee: () => "", supplier: () => "Youssef" }, [approved], [{ id: "sup_dev", category: SupplierCategory.SUBCONTRACTOR }])
    expect(lines.filter((l) => l.journal === "HA").map((l) => [l.account, l.debit, l.credit])).toEqual([["6136", 2500, 0], ["34552", 450, 0], ["4411", 0, 2950]])
    expect(lines.filter((l) => l.journal === "BQ").map((l) => [l.account, l.debit, l.credit])).toEqual([["4411", 1475, 0], ["5141", 0, 1475]])
  })
})
