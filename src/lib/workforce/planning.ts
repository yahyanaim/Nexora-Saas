import type { Employee } from "@/types/workforce"
import { TaskStatus, type WorkTask } from "@/types/work-projects"
import { ANNUAL_VACATION_DAYS, LeaveStatus, LeaveType, type LeaveRequest } from "@/types/work-planning"
import { addDays, weekDays } from "./billing"
import { todayIso } from "./project-metrics"

/** Saturday or Sunday. */
export function isWeekend(iso: string) {
  const day = new Date(`${iso}T00:00:00`).getDay()
  return day === 0 || day === 6
}

/** Every date from start to end, inclusive. */
export function datesBetween(start: string, end: string) {
  const out: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

/** Monday–Friday dates from start to end, inclusive. */
export function workingDays(start: string, end: string) {
  return datesBetween(start, end).filter((d) => !isWeekend(d))
}

/** Whether two inclusive date ranges share at least one day. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd
}

/** Approved leave days (working days only) of one employee, optionally within a range. */
export function leaveDays(requests: LeaveRequest[], employeeId: string, from?: string, to?: string) {
  const days = new Set<string>()
  for (const r of requests) {
    if (r.employeeId !== employeeId || r.status !== LeaveStatus.APPROVED) continue
    for (const d of workingDays(r.startDate, r.endDate)) {
      if ((!from || d >= from) && (!to || d <= to)) days.add(d)
    }
  }
  return days
}

/** Vacation allowance for a year: used (approved), pending and what's left. */
export function vacationBalance(
  requests: LeaveRequest[],
  employeeId: string,
  year: number,
  allowance: number = ANNUAL_VACATION_DAYS
) {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const count = (status: LeaveStatus) =>
    requests
      .filter((r) => r.employeeId === employeeId && r.type === LeaveType.VACATION && r.status === status)
      .reduce((sum, r) => sum + workingDays(r.startDate < from ? from : r.startDate, r.endDate > to ? to : r.endDate).length, 0)
  const used = count(LeaveStatus.APPROVED)
  const pending = count(LeaveStatus.PENDING)
  return { allowance, used, pending, remaining: allowance - used - pending }
}

/** Hours someone can be planned for in a week: capacity spread over working days, minus leave. */
export function weeklyCapacity(employee: Employee, requests: LeaveRequest[], monday: string) {
  const days = weekDays(monday).filter((d) => !isWeekend(d))
  const off = leaveDays(requests, employee.id, days[0], days[days.length - 1])
  const perDay = employee.weeklyCapacity / 5
  return Math.round(perDay * days.filter((d) => !off.has(d)).length * 10) / 10
}

/**
 * Hours of open work planned in a week. Each open task's estimate is spread
 * evenly over the working days from today (or the week, if later) to its due
 * date; overdue work lands on today. Tasks without a due date aren't planned.
 */
export function plannedHours(tasks: WorkTask[], employeeId: string, monday: string, today = todayIso()) {
  const weekEnd = addDays(monday, 6)
  let hours = 0
  for (const task of tasks) {
    if (task.assigneeId !== employeeId || task.status === TaskStatus.DONE || !task.dueDate) continue
    const start = today
    const end = task.dueDate < today ? today : task.dueDate
    let days = workingDays(start, end)
    if (days.length === 0) days = [end]
    const perDay = task.estimatedHours / days.length
    hours += days.filter((d) => d >= monday && d <= weekEnd).length * perDay
  }
  return Math.round(hours * 10) / 10
}

/** Planned hours as a share of capacity, for the workload heatmap. */
export function loadPercent(planned: number, capacity: number) {
  if (capacity <= 0) return planned > 0 ? Infinity : 0
  return Math.round((planned / capacity) * 100)
}
