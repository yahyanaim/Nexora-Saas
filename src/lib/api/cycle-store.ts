import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import type { Cycle } from "@/types/work-projects"

/**
 * The cycles collection (P4), on its own so the task API can check a task's
 * cycle without importing the cycles API (which uses the task API).
 */
function seed(workspaceId: string): Cycle[] {
  if (workspaceId !== "ws_atlas") return []
  const today = todayIso()
  const d = (n: number) => addDays(today, n)
  const at = `${d(-21)}T09:00:00.000Z`
  const rows: Omit<Cycle, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "cyc_orbit_1", projectId: "prj_orbit", number: 1, name: "Cycle 1 · Design", startDate: d(-20), endDate: d(-7), goal: "Finish the visual design system", closedAt: `${d(-6)}T17:00:00.000Z`, closedBy: "Karim Haddad", summary: { committedHours: 24, doneHours: 24, doneTasks: 1, carriedTasks: 0, carriedTo: "next" } },
    { id: "cyc_orbit_2", projectId: "prj_orbit", number: 2, name: "Cycle 2 · Tracking", startDate: d(-6), endDate: d(7), goal: "Shipment tracking ready for the beta" },
    { id: "cyc_orbit_3", projectId: "prj_orbit", number: 3, name: "Cycle 3 · Launch", startDate: d(8), endDate: d(21), goal: "Load testing and launch" },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: at, updatedAt: at }))
}

export const cycles = createCollection<Cycle>("cycles", "cyc", seed)
