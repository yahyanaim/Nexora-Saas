import { createCollection } from "@/lib/workforce/demo-store"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { assertBooking } from "@/lib/workforce/resource-planning"
import { recordAudit } from "@/lib/workforce/audit"
import type { ResourceBooking, ResourceBookingInput } from "@/types/work-planning"

/**
 * Resource bookings (Phase 6g.1). Backed by the browser demo store for now;
 * replace the bodies with apiClient calls once the backend exists.
 */
const bookings = createCollection<ResourceBooking>("resource-bookings", "bkg", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const monday = weekStart(todayIso())
  const w = (n: number) => addDays(monday, n * 7)
  const end = (n: number) => addDays(monday, n * 7 + 4)
  const rows: Omit<ResourceBooking, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "bkg_lina", projectId: "prj_orbit", employeeId: "emp_lina", startDate: w(0), endDate: end(5), hoursPerWeek: 32, tentative: false },
    { id: "bkg_noah", projectId: "prj_orbit", employeeId: "emp_noah", startDate: w(0), endDate: end(3), hoursPerWeek: 30, tentative: false },
    { id: "bkg_karim", projectId: "prj_helio", employeeId: "emp_karim", startDate: w(0), endDate: end(1), hoursPerWeek: 20, tentative: false },
    { id: "bkg_amina", projectId: "prj_helio", employeeId: "emp_amina", startDate: w(0), endDate: end(2), hoursPerWeek: 24, tentative: false, note: "Dashboard visuals before the client demo" },
    { id: "bkg_julia", projectId: "prj_medica", employeeId: "emp_julia", startDate: w(1), endDate: end(9), hoursPerWeek: 24, tentative: true, note: "Starts once the quote is signed" },
    { id: "bkg_role", projectId: "prj_medica", roleTitle: "Senior mobile developer", startDate: w(2), endDate: end(11), hoursPerWeek: 40, tentative: false },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: `${monday}T08:00:00.000Z`, updatedAt: `${monday}T08:00:00.000Z` }))
})

const clean = (input: ResourceBookingInput): ResourceBookingInput => ({
  ...input,
  employeeId: input.employeeId || undefined,
  // A named person replaces the placeholder role
  roleTitle: input.employeeId ? undefined : input.roleTitle?.trim(),
  note: input.note?.trim() || undefined,
})

export async function listBookingsApi(workspaceId: string): Promise<ResourceBooking[]> {
  return bookings.list(workspaceId)
}

export async function saveBookingApi(workspaceId: string, input: ResourceBookingInput, id?: string): Promise<ResourceBooking> {
  const value = clean(input)
  assertBooking(value)
  if (id) {
    if (!bookings.get(workspaceId, id)) throw new Error("Booking not found")
    // update() merges; clear the field the other kind of booking used
    return bookings.update(workspaceId, id, { ...value, employeeId: value.employeeId, roleTitle: value.roleTitle })
  }
  const created = bookings.create(workspaceId, value)
  recordAudit(workspaceId, { action: "Resource booked", actionKey: "booking.created", category: "Team", target: value.roleTitle ?? value.employeeId ?? "" })
  return created
}

/** Staffs a placeholder role with a person. */
export async function assignBookingApi(workspaceId: string, id: string, employeeId: string): Promise<ResourceBooking> {
  const b = bookings.get(workspaceId, id)
  if (!b) throw new Error("Booking not found")
  if (!employeeId) throw new Error("Choose a person or name the role to staff")
  recordAudit(workspaceId, { action: "Role staffed", actionKey: "booking.assigned", category: "Team", target: b.roleTitle ?? "" })
  return bookings.update(workspaceId, id, { employeeId, roleTitle: undefined })
}

export async function deleteBookingApi(workspaceId: string, id: string): Promise<void> {
  if (!bookings.get(workspaceId, id)) throw new Error("Booking not found")
  bookings.remove(workspaceId, id)
}
