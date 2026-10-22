import { getAuditActor, recordAudit } from "@/lib/workforce/audit"
import { assertCycle, cycleProgress, cycleTasks, followingCycle, nextCycleDates } from "@/lib/workforce/cycles"
import { todayIso } from "@/lib/workforce/project-metrics"
import { isClosedStatus, type Cycle, type CycleInput } from "@/types/work-projects"
import { cycles } from "./cycle-store"
import { getProjectApi, listTasksApi, updateTaskApi } from "./work-projects-api"

/**
 * Cycles (sprints) of a project (P4). Browser demo store for now; replace the
 * bodies with apiClient calls once the backend exists.
 */

export async function listCyclesApi(workspaceId: string, projectId?: string): Promise<Cycle[]> {
  const all = cycles.list(workspaceId)
  return (projectId ? all.filter((c) => c.projectId === projectId) : all).sort((a, b) => a.startDate.localeCompare(b.startDate))
}

const ofProject = (workspaceId: string, projectId: string) => cycles.list(workspaceId).filter((c) => c.projectId === projectId)

/** Creates or changes a cycle; a closed cycle stays as it was. */
export async function saveCycleApi(workspaceId: string, input: CycleInput, id?: string): Promise<Cycle> {
  const value = { ...input, name: input.name.trim(), goal: input.goal?.trim() || undefined }
  if (!(await getProjectApi(workspaceId, value.projectId))) throw new Error("Project not found")
  assertCycle(value, ofProject(workspaceId, value.projectId), id)
  if (id) {
    const current = cycles.get(workspaceId, id)
    if (!current) throw new Error("Cycle not found")
    if (current.closedAt) throw new Error("This cycle is closed")
    return cycles.update(workspaceId, id, { name: value.name, goal: value.goal, startDate: value.startDate, endDate: value.endDate })
  }
  const number = ofProject(workspaceId, value.projectId).reduce((m, c) => Math.max(m, c.number), 0) + 1
  return cycles.create(workspaceId, { ...value, number })
}

/** Deletes an open cycle; its tasks go back to the backlog. */
export async function deleteCycleApi(workspaceId: string, id: string): Promise<void> {
  const cycle = cycles.get(workspaceId, id)
  if (!cycle) return
  if (cycle.closedAt) throw new Error("This cycle is closed")
  for (const t of (await listTasksApi(workspaceId, cycle.projectId)).filter((x) => x.cycleId === id)) await updateTaskApi(workspaceId, t.id, { cycleId: undefined })
  cycles.remove(workspaceId, id)
}

/**
 * Closes a cycle: unfinished tasks move to the next open cycle (made if there
 * is none) or back to the backlog, and the cycle keeps a summary of what was
 * committed and done.
 */
export async function closeCycleApi(workspaceId: string, id: string, carryTo: "next" | "backlog"): Promise<{ cycle: Cycle; next?: Cycle }> {
  const cycle = cycles.get(workspaceId, id)
  if (!cycle) throw new Error("Cycle not found")
  if (cycle.closedAt) throw new Error("This cycle is closed")
  const tasks = cycleTasks(await listTasksApi(workspaceId, cycle.projectId), id)
  const unfinished = tasks.filter((t) => !isClosedStatus(t.status))
  let next: Cycle | undefined
  if (carryTo === "next" && unfinished.length) {
    next = followingCycle(ofProject(workspaceId, cycle.projectId), cycle)
    if (!next) {
      const others = ofProject(workspaceId, cycle.projectId)
      const dates = nextCycleDates(others, todayIso() > cycle.endDate ? todayIso() : cycle.endDate)
      const number = others.reduce((m, c) => Math.max(m, c.number), 0) + 1
      next = cycles.create(workspaceId, { projectId: cycle.projectId, number, name: `Cycle ${number}`, ...dates })
    }
  }
  for (const t of unfinished) await updateTaskApi(workspaceId, t.id, { cycleId: next?.id })
  const progress = cycleProgress(tasks)
  const closed = cycles.update(workspaceId, id, {
    closedAt: new Date().toISOString(),
    closedBy: getAuditActor().name,
    summary: { committedHours: progress.committedHours, doneHours: progress.doneHours, doneTasks: progress.doneTasks, carriedTasks: unfinished.length, carriedTo: next ? "next" : "backlog" },
  })
  recordAudit(workspaceId, { action: "Cycle closed", actionKey: "cycle.closed", category: "Settings", target: cycle.name })
  return { cycle: closed, next }
}
