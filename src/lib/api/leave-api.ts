import { HalfDay, LeaveStatus, LeaveType, type LeaveRequest, type LeaveRequestInput } from "@/types/work-planning"
import { createCollection } from "@/lib/workforce/demo-store"
import { getSettingsApi } from "./settings-api"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { rangesOverlap, workingDays } from "@/lib/workforce/planning"
import { recordAudit } from "@/lib/workforce/audit"
import { balanceProblem } from "@/lib/workforce/leave-balances"
import { listEmployeesApi } from "./employees-api"

const STAMP = "2026-01-05T09:00:00.000Z"

/** Sample leave around today so the calendar and workload have something to show. */
function seedLeave(workspaceId: string): LeaveRequest[] {
  const monday = weekStart(todayIso())
  const rows: Omit<LeaveRequest, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "lv_1", employeeId: "emp_omar", type: LeaveType.VACATION, startDate: addDays(monday, -3), endDate: addDays(monday, 11), status: LeaveStatus.APPROVED, note: "Family trip" },
          { id: "lv_2", employeeId: "emp_julia", type: LeaveType.VACATION, startDate: addDays(monday, 14), endDate: addDays(monday, 18), status: LeaveStatus.PENDING },
          { id: "lv_3", employeeId: "emp_lina", type: LeaveType.SICK, startDate: addDays(monday, -9), endDate: addDays(monday, -8), status: LeaveStatus.APPROVED },
          { id: "lv_4", employeeId: "emp_noah", type: LeaveType.PERSONAL, startDate: addDays(monday, 4), endDate: addDays(monday, 4), status: LeaveStatus.PENDING, note: "Moving house" },
          { id: "lv_5", employeeId: "emp_karim", type: LeaveType.VACATION, startDate: addDays(monday, 9), endDate: addDays(monday, 9), halfDay: HalfDay.AFTERNOON, status: LeaveStatus.APPROVED, note: "School event" },
        ]
      : workspaceId === "ws_northwind"
        ? [{ id: "lv_10", employeeId: "emp_chloe", type: LeaveType.VACATION, startDate: addDays(monday, 7), endDate: addDays(monday, 11), status: LeaveStatus.APPROVED }]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Leave requests. Backed by the browser demo store for now; replace the
 * bodies with apiClient calls once the backend exists.
 */
const leave = createCollection<LeaveRequest>("leave", "lv", seedLeave)

const ACTIVE = [LeaveStatus.PENDING, LeaveStatus.APPROVED]

export async function listLeaveApi(workspaceId: string): Promise<LeaveRequest[]> {
  return leave.list(workspaceId).sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export async function requestLeaveApi(workspaceId: string, input: LeaveRequestInput): Promise<LeaveRequest> {
  if (input.endDate < input.startDate) throw new Error("The last day can't be before the first day")
  const { leaveTypes } = await getSettingsApi(workspaceId)
  if (!leaveTypes.some((l) => l.type === input.type && l.enabled)) {
    throw new Error("This leave type is turned off in the workspace settings")
  }
  if (input.halfDay && input.startDate !== input.endDate) throw new Error("A half day must start and end on the same day")
  if (workingDays(input.startDate, input.endDate).length === 0) throw new Error("Pick at least one working day")
  const clash = leave
    .list(workspaceId)
    .some(
      (r) =>
        r.employeeId === input.employeeId &&
        ACTIVE.includes(r.status) &&
        rangesOverlap(r.startDate, r.endDate, input.startDate, input.endDate) &&
        // A morning and an afternoon on the same day do not clash
        !(r.halfDay && input.halfDay && r.halfDay !== input.halfDay)
    )
  if (clash) throw new Error("This overlaps another leave request")
  const settings = await getSettingsApi(workspaceId)
  const person = (await listEmployeesApi(workspaceId)).find((e) => e.id === input.employeeId)
  if (person) {
    const problem = balanceProblem(leave.list(workspaceId), person, settings.leaveTypes, input, settings.holidays.map((h) => h.date))
    if (problem) throw new Error(problem)
  }
  return leave.create(workspaceId, { ...input, note: input.note || undefined, halfDay: input.halfDay || undefined, status: LeaveStatus.PENDING })
}

export async function decideLeaveApi(
  workspaceId: string,
  id: string,
  approved: boolean,
  decisionNote?: string
): Promise<LeaveRequest> {
  const request = leave.get(workspaceId, id)
  if (!request) throw new Error("Leave request not found")
  if (request.status !== LeaveStatus.PENDING) throw new Error("Only pending requests can be decided")
  if (!approved && !decisionNote?.trim()) throw new Error("Give a reason when declining")
  recordAudit(workspaceId, {
    action: approved ? "Leave approved" : "Leave declined",
    actionKey: approved ? "leave.approved" : "leave.declined",
    category: "Approvals",
    target: `${request.type} ${request.startDate} → ${request.endDate}`,
    before: request.status,
    after: approved ? LeaveStatus.APPROVED : `${LeaveStatus.REJECTED}: ${decisionNote!.trim()}`,
  })
  return leave.update(workspaceId, id, {
    status: approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
    decisionNote: decisionNote?.trim() || undefined,
  })
}

/** Withdraws a pending request, or cancels approved leave that hasn't started yet. */
export async function cancelLeaveApi(workspaceId: string, id: string, today = todayIso()): Promise<LeaveRequest> {
  const request = leave.get(workspaceId, id)
  if (!request) throw new Error("Leave request not found")
  const cancellable =
    request.status === LeaveStatus.PENDING || (request.status === LeaveStatus.APPROVED && request.startDate > today)
  if (!cancellable) throw new Error("Leave that has started or ended can't be cancelled")
  return leave.update(workspaceId, id, { status: LeaveStatus.CANCELLED })
}
