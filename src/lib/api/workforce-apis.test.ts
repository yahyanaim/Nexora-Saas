import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  createEmployeeApi,
  deleteEmployeeApi,
  listEmployeesApi,
  updateEmployeeApi,
} from "./employees-api"
import { createClientApi, listClientsApi, updateClientApi } from "./clients-api"
import {
  ClientStatus,
  EmployeeStatus,
  EmploymentType,
  WorkRole,
  type ClientInput,
  type EmployeeInput,
} from "@/types/workforce"

const employeeInput: EmployeeInput = {
  name: "Test Person",
  email: "test@example.com",
  jobTitle: "Developer",
  role: WorkRole.EMPLOYEE,
  employmentType: EmploymentType.FULL_TIME,
  status: EmployeeStatus.ACTIVE,
  hireDate: "2026-01-01",
  hourlyCost: 40,
  billableRate: 90,
  weeklyCapacity: 40,
  skills: [],
}

const clientInput: ClientInput = {
  name: "Acme",
  email: "ap@acme.example",
  status: ClientStatus.ACTIVE,
  paymentTermsDays: 30,
  contacts: [],
}

describe("workforce demo APIs", () => {
  beforeEach(() => localStorage.clear())

  it("seeds each workspace with its own employees", async () => {
    const atlas = await listEmployeesApi("ws_atlas")
    const northwind = await listEmployeesApi("ws_northwind")
    expect(atlas.length).toBeGreaterThan(0)
    expect(northwind.length).toBeGreaterThan(0)
    expect(atlas.every((e) => e.workspaceId === "ws_atlas")).toBe(true)
    expect(atlas.map((e) => e.id)).not.toEqual(northwind.map((e) => e.id))
  })

  it("creates an employee in one workspace only and persists it", async () => {
    const created = await createEmployeeApi("ws_atlas", employeeInput)
    expect(created.id).toMatch(/^emp_/)
    expect((await listEmployeesApi("ws_atlas"))[0]?.id).toBe(created.id)
    expect((await listEmployeesApi("ws_northwind")).some((e) => e.id === created.id)).toBe(false)
  })

  it("rejects a duplicate email in the same workspace", async () => {
    await createEmployeeApi("ws_atlas", employeeInput)
    await expect(
      createEmployeeApi("ws_atlas", { ...employeeInput, email: "TEST@example.com " })
    ).rejects.toThrow(/already exists/)
    await expect(createEmployeeApi("ws_northwind", employeeInput)).resolves.toBeTruthy()
  })

  it("refuses to make an employee their own manager", async () => {
    await expect(
      updateEmployeeApi("ws_atlas", "emp_lina", { managerId: "emp_lina" })
    ).rejects.toThrow(/own manager/)
  })

  it("clears the manager of direct reports when an employee is deleted", async () => {
    const lead = await createEmployeeApi("ws_atlas", { ...employeeInput, email: "temp.lead@example.com" })
    await updateEmployeeApi("ws_atlas", "emp_noah", { managerId: lead.id })
    await deleteEmployeeApi("ws_atlas", lead.id)
    const employees = await listEmployeesApi("ws_atlas")
    expect(employees.some((e) => e.id === lead.id)).toBe(false)
    expect(employees.find((e) => e.id === "emp_noah")?.managerId).toBeUndefined()
  })

  it("keeps people with history: they become former employees instead of being deleted", async () => {
    await expect(deleteEmployeeApi("ws_atlas", "emp_karim")).rejects.toThrow(/Former employee/)
  })

  it("reseeds when stored data is corrupt", async () => {
    localStorage.setItem("nexora:employees:ws_atlas", "{not json")
    expect((await listEmployeesApi("ws_atlas")).length).toBeGreaterThan(0)
  })

  it("keeps exactly one primary contact per client", async () => {
    const created = await createClientApi("ws_atlas", {
      ...clientInput,
      contacts: [
        { id: "a", name: "A", email: "a@x.example", isPrimary: false },
        { id: "b", name: "B", email: "b@x.example", isPrimary: false },
      ],
    })
    expect(created.contacts.map((c) => c.isPrimary)).toEqual([true, false])

    const updated = await updateClientApi("ws_atlas", created.id, {
      contacts: created.contacts.map((c) => ({ ...c, isPrimary: true })),
    })
    expect(updated.contacts.filter((c) => c.isPrimary)).toHaveLength(1)
    expect((await listClientsApi("ws_atlas"))[0]?.id).toBe(created.id)
  })

  it("stamps updatedAt on update", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-03T12:00:00Z"))
    const updated = await updateClientApi("ws_atlas", "cli_orbit", { notes: "hi" })
    expect(updated.updatedAt).toBe("2026-10-03T12:00:00.000Z")
    vi.useRealTimers()
  })
})
