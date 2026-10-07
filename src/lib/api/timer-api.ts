import type { TimeEntry } from "@/types/work-billing"
import { readDocument, writeDocument } from "@/lib/workforce/demo-store"
import { todayIso } from "@/lib/workforce/project-metrics"
import { addHoursApi } from "./work-billing-api"

/**
 * One running timer per person (TIM-2). Stopping it adds the time to that
 * day's timesheet cell, rounded up to the next 15 minutes.
 */
export interface RunningTimer {
  employeeId: string
  projectId: string
  taskId?: string
  /** ISO timestamp */
  startedAt: string
}

type Timers = Record<string, RunningTimer>

const read = (workspaceId: string) => readDocument<Timers>("timers", workspaceId, () => ({}))

/** Every running timer of the workspace, for managers (Phase 6h.5). */
export async function listRunningTimersApi(workspaceId: string): Promise<RunningTimer[]> {
  return Object.values(read(workspaceId))
}

export async function getTimerApi(workspaceId: string, employeeId: string): Promise<RunningTimer | null> {
  return read(workspaceId)[employeeId] ?? null
}

/** Hours to log for a timer, rounded up to a quarter hour (at least 15 minutes). */
export function timerHours(startedAt: string, now = new Date()) {
  const ms = Math.max(0, now.getTime() - new Date(startedAt).getTime())
  return Math.max(0.25, Math.ceil(ms / (15 * 60 * 1000)) / 4)
}

/** Starts a timer; a running one is stopped and logged first. */
export async function startTimerApi(
  workspaceId: string,
  timer: Omit<RunningTimer, "startedAt">,
  now = new Date()
): Promise<RunningTimer> {
  if (read(workspaceId)[timer.employeeId]) await stopTimerApi(workspaceId, timer.employeeId, now)
  const running = { ...timer, startedAt: now.toISOString() }
  writeDocument("timers", workspaceId, { ...read(workspaceId), [timer.employeeId]: running })
  return running
}

export async function stopTimerApi(workspaceId: string, employeeId: string, now = new Date()): Promise<TimeEntry | null> {
  const timers = read(workspaceId)
  const running = timers[employeeId]
  if (!running) throw new Error("No timer is running")
  const rest = { ...timers }
  delete rest[employeeId]
  writeDocument("timers", workspaceId, rest)
  return addHoursApi(workspaceId, {
    employeeId,
    projectId: running.projectId,
    taskId: running.taskId,
    date: todayIso(new Date(running.startedAt)),
    hours: timerHours(running.startedAt, now),
  })
}

export async function discardTimerApi(workspaceId: string, employeeId: string) {
  const rest = { ...read(workspaceId) }
  delete rest[employeeId]
  writeDocument("timers", workspaceId, rest)
}
