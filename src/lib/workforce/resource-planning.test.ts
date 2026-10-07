import { describe, it, expect, beforeEach } from "vitest"
import { assertBooking, bookingHoursInWeek, capacityForecast, forecastWeeks, openRoleHours, weekLoad } from "./resource-planning"
import { assignBookingApi, listBookingsApi, saveBookingApi } from "@/lib/api/resource-bookings-api"
import { EmployeeStatus, EmploymentType, WorkRole, type Employee } from "@/types/workforce"
import { LeaveStatus, LeaveType, type ResourceBooking } from "@/types/work-planning"

const emp = (over: Partial<Employee> = {}): Employee => ({
  id: "e1", workspaceId: "ws", name: "Rania", email: "r@x.ma", jobTitle: "Dev", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME,
  status: EmployeeStatus.ACTIVE, hireDate: "2025-01-01", hourlyCost: 150, billableRate: 400, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "", ...over,
})
const bk = (over: Partial<ResourceBooking>): ResourceBooking => ({ id: "b", workspaceId: "ws", projectId: "p", employeeId: "e1", startDate: "2026-03-02", endDate: "2026-03-27", hoursPerWeek: 20, tentative: false, createdAt: "", updatedAt: "", ...over })
const MON = "2026-03-02"

describe("resource planning (Phase 6g.1)", () => {
  beforeEach(() => localStorage.clear())

  it("spreads a booking over the working days of each week it covers", () => {
    expect(forecastWeeks("2026-03-04", 3)).toEqual(["2026-03-02", "2026-03-09", "2026-03-16"])
    expect(bookingHoursInWeek(bk({}), MON)).toBe(20)
    // From Wednesday: 3 of 5 days
    expect(bookingHoursInWeek(bk({ startDate: "2026-03-04" }), MON)).toBe(12)
    expect(bookingHoursInWeek(bk({}), "2026-03-30")).toBe(0)
    // A public holiday on Friday takes its share out
    expect(bookingHoursInWeek(bk({}), MON, undefined, ["2026-03-06"])).toBe(16)
  })

  it("compares confirmed hours with capacity net of leave, keeping tentative hours apart", () => {
    const [row] = capacityForecast(
      {
        employees: [emp(), emp({ id: "gone", status: EmployeeStatus.INACTIVE })],
        bookings: [bk({ hoursPerWeek: 30 }), bk({ id: "t", hoursPerWeek: 10, tentative: true }), bk({ id: "x", startDate: "2026-03-09", hoursPerWeek: 16 })],
        leave: [{ id: "l", workspaceId: "ws", employeeId: "e1", type: LeaveType.VACATION, startDate: "2026-03-12", endDate: "2026-03-13", status: LeaveStatus.APPROVED, createdAt: "", updatedAt: "" }],
      },
      ["2026-03-02", "2026-03-09"]
    )
    expect(row!.weeks.map((w) => [w.capacity, w.confirmed, w.tentative, w.load])).toEqual([
      [40, 30, 10, "ok"],
      [24, 46, 10, "over"],
    ])
  })

  it("labels loads and lists open roles", () => {
    expect([weekLoad(10, 40), weekLoad(30, 40), weekLoad(38, 40), weekLoad(41, 40), weekLoad(0, 0)]).toEqual(["free", "ok", "full", "over", "free"])
    const roles = openRoleHours([bk({ employeeId: undefined, roleTitle: "Designer" }), bk({ id: "named" })], [MON])
    expect(roles.map((r) => [r.booking.roleTitle, r.weeks])).toEqual([["Designer", [20]]])
  })

  it("checks bookings and staffs a placeholder role", async () => {
    expect(() => assertBooking({ projectId: "p", startDate: MON, endDate: MON, hoursPerWeek: 10, tentative: false })).toThrow(/person or name the role/)
    expect(() => assertBooking({ projectId: "p", employeeId: "e1", startDate: "2026-03-10", endDate: MON, hoursPerWeek: 10, tentative: false })).toThrow(/end date/)
    expect(() => assertBooking({ projectId: "p", employeeId: "e1", startDate: MON, endDate: MON, hoursPerWeek: 0, tentative: false })).toThrow(/between 1 and 80/)
    const role = (await listBookingsApi("ws_atlas")).find((b) => b.id === "bkg_role")!
    expect(role.roleTitle).toBe("Senior mobile developer")
    const staffed = await assignBookingApi("ws_atlas", role.id, "emp_omar")
    expect(staffed).toMatchObject({ employeeId: "emp_omar", roleTitle: undefined })
    // Turning a person's booking back into an open role clears the person
    const back = await saveBookingApi("ws_atlas", { projectId: "prj_medica", employeeId: "", roleTitle: "Mobile developer", startDate: MON, endDate: "2026-04-03", hoursPerWeek: 40, tentative: false }, role.id)
    expect(back).toMatchObject({ employeeId: undefined, roleTitle: "Mobile developer" })
  })
})
