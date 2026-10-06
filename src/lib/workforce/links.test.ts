import { describe, it, expect } from "vitest"
import { findCurrentEmployee } from "./current-employee"
import { buildInbox, type InboxInput } from "./inbox"
import { buildReport } from "./reports"
import { startReviewCycleApi } from "@/lib/api/reviews-api"
import { getSettingsApi, updateOwnerEmployeeApi } from "@/lib/api/settings-api"
import { ReviewStatus, type PerformanceReview } from "@/types/work-reviews"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { LeaveStatus, type LeaveRequest } from "@/types/work-planning"
import { EmployeeStatus, type Employee } from "@/types/workforce"
import type { WorkProject } from "@/types/work-projects"

const people = [
  { id: "sara", name: "Sara", email: "sara@x.io", status: EmployeeStatus.ACTIVE, hourlyCost: 50, billableRate: 100, weeklyCapacity: 40 },
  { id: "dev", name: "Dev", email: "dev@x.io", managerId: "sara", status: EmployeeStatus.ACTIVE, hourlyCost: 40, billableRate: 90, weeklyCapacity: 40 },
] as Employee[]

describe("current employee", () => {
  it("uses the account link, then the email, then the owner link for the admin owner", () => {
    expect(findCurrentEmployee(people, { employeeId: "dev" })?.id).toBe("dev")
    expect(findCurrentEmployee(people, { email: "DEV@x.io" })?.id).toBe("dev")
    expect(findCurrentEmployee(people, { email: "alex@company.io", role: "admin" }, "sara")?.id).toBe("sara")
    expect(findCurrentEmployee(people, { email: "alex@company.io", role: "user" }, "sara")).toBeUndefined()
    expect(findCurrentEmployee(people, { email: "sara@x.io", clientId: "c1" })).toBeUndefined()
  })
  it("seeds the demo owner link and lets the owner change it", async () => {
    expect((await getSettingsApi("ws_atlas")).ownerEmployeeId).toBe("emp_sara")
    expect((await updateOwnerEmployeeApi("ws_atlas", null)).ownerEmployeeId).toBe("")
    expect((await getSettingsApi("ws_atlas")).ownerEmployeeId).toBe("")
  })
})

describe("work inbox", () => {
  const base: InboxInput = {
    viewer: { employeeId: "sara", isAdmin: false },
    rights: { approveTime: true, invoices: false, hr: false },
    employees: people,
    reviews: [{ id: "r1", employeeId: "dev", reviewerId: "sara", period: "H2", status: ReviewStatus.MANAGER } as PerformanceReview],
    entries: [
      { id: "t1", employeeId: "dev", status: TimeEntryStatus.SUBMITTED, hours: 6 },
      { id: "t2", employeeId: "sara", status: TimeEntryStatus.SUBMITTED, hours: 2 },
    ] as TimeEntry[],
    leave: [{ id: "l1", employeeId: "dev", status: LeaveStatus.PENDING } as LeaveRequest],
    expenses: [],
    invoices: [],
    documents: [],
    tasks: [],
    today: "2026-10-06",
  }
  it("lists reviews and approvals, but never the approver's own items", () => {
    const items = buildInbox(base)
    expect(items.map((i) => i.title)).toEqual(["inboxReview_manager", "inboxTimesheets", "inboxLeave"])
    expect(items[1]!.values).toEqual({ count: 1, hours: 6 })
  })
  it("shows nothing to approve without the right", () => {
    expect(buildInbox({ ...base, rights: { approveTime: false, invoices: false, hr: false }, reviews: [] })).toEqual([])
  })
})

describe("links between modules", () => {
  it("adds overhead to the profitability report when set", () => {
    const project = { id: "p", code: "P-1", name: "P", status: "active" } as unknown as WorkProject
    const data = {
      entries: [{ id: "e", projectId: "p", employeeId: "dev", date: "2026-10-01", hours: 10, billable: false, status: TimeEntryStatus.APPROVED }] as TimeEntry[],
      invoices: [], projects: [project], clients: [], employees: people, departments: [], expenses: [], tasks: [], leave: [],
    }
    const f = { from: "2026-10-01", to: "2026-10-31" }
    const plain = buildReport("profitability", data, f, { canSeeCosts: true, today: "2026-10-06" })
    const loaded = buildReport("profitability", { ...data, overheadRate: 12 }, f, { canSeeCosts: true, today: "2026-10-06" })
    expect(plain.columns.some((c) => c.key === "overhead")).toBe(false)
    expect(loaded.rows[0]!.overhead).toBe(120)
    expect(Number(loaded.rows[0]!.profit)).toBe(Number(plain.rows[0]!.profit) - 120)
  })
  it("lets HR pick a reviewer for someone without a manager", async () => {
    const created = await startReviewCycleApi("ws_links", { period: "H2", from: "2026-07-01", to: "2026-12-31", employeeIds: ["sara", "dev"], reviewerIds: { sara: "dev" } }, people)
    expect(created.map((r) => [r.employeeId, r.reviewerId])).toEqual([["sara", "dev"], ["dev", "sara"]])
  })
})
