import { describe, it, expect, beforeEach } from "vitest"
import { hourlyRate } from "./billing"
import { listAudit } from "./audit"
import { createClientApi, deleteClientApi, listClientsApi } from "@/lib/api/clients-api"
import { changeRateApi } from "@/lib/api/employees-api"
import { ClientStatus, EmployeeStatus, EmploymentType, WorkRole, type Client, type Employee } from "@/types/workforce"

const employee: Employee = {
  id: "e1", workspaceId: "ws", name: "E", email: "e@x.example", jobTitle: "Senior consultant", role: WorkRole.EMPLOYEE,
  employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-01-01",
  hourlyCost: 300, billableRate: 700, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "",
}
const client = (o: Partial<Client> = {}): Client => ({
  id: "c1", workspaceId: "ws", name: "C", email: "c@x.example", status: ClientStatus.ACTIVE,
  paymentTermsDays: 30, contacts: [], createdAt: "", updatedAt: "", ...o,
})

describe("rate resolution (section 6.5)", () => {
  it("person entry, then job title, then client rate, then the employee's own rate", () => {
    expect(hourlyRate(employee, client({ rateCard: [{ id: "a", jobTitle: "senior Consultant ", rate: 800 }, { id: "b", employeeId: "e1", rate: 850 }], hourlyRate: 600 }))).toBe(850)
    expect(hourlyRate(employee, client({ rateCard: [{ id: "a", jobTitle: "Senior consultant", rate: 800 }], hourlyRate: 600 }))).toBe(800)
    expect(hourlyRate(employee, client({ hourlyRate: 600 }))).toBe(600)
    expect(hourlyRate(employee, client())).toBe(700)
  })
})

describe("clients", () => {
  beforeEach(() => localStorage.clear())

  it("validates ICE and duplicate rate card lines", async () => {
    const base = { name: "Acme", email: "a@x.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [] }
    await expect(createClientApi("ws_x", { ...base, ice: "12" })).rejects.toThrow(/15 digits/)
    await expect(
      createClientApi("ws_x", { ...base, rateCard: [{ id: "a", employeeId: "e1", rate: 1 }, { id: "b", employeeId: "e1", rate: 2 }] })
    ).rejects.toThrow(/twice/)
  })

  it("only archives a client that has invoices (CRM-6)", async () => {
    // Seeded Atlas data has invoices for Helio Energy
    const helio = (await listClientsApi("ws_atlas")).find((c) => c.name === "Helio Energy")!
    await expect(deleteClientApi("ws_atlas", helio.id)).rejects.toThrow(/archived/)
  })
})

describe("audit trail (PLT-12)", () => {
  beforeEach(() => localStorage.clear())

  it("records rate changes with before and after", async () => {
    await changeRateApi("ws_atlas", "emp_lina", { effectiveFrom: "2026-12-01", hourlyCost: 60, billableRate: 130, reason: "Raise" })
    const [entry] = listAudit("ws_atlas")
    expect(entry!.action).toBe("Rates changed")
    expect(entry!.details).toContain("→")
  })
})
