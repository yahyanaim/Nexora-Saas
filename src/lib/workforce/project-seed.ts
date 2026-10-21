import {
  BudgetType,
  Priority,
  TaskRelationType,
  TaskStatus,
  WorkProjectStatus,
  type Milestone,
  type WorkProject,
  type WorkTask,
} from "@/types/work-projects"
import { todayIso } from "./project-metrics"

/** Orbit has its own statuses, with "Waiting for client" among the started ones (P2) */
const ORBIT_STATES = [
  { id: TaskStatus.TODO, group: TaskStatus.TODO },
  { id: TaskStatus.IN_PROGRESS, group: TaskStatus.IN_PROGRESS },
  { id: "st_orbit_waiting", name: "Waiting for client", group: TaskStatus.IN_PROGRESS },
  { id: TaskStatus.REVIEW, group: TaskStatus.REVIEW },
  { id: TaskStatus.DONE, group: TaskStatus.DONE },
  { id: TaskStatus.CANCELLED, group: TaskStatus.CANCELLED },
]

/** Seed dates are relative to today so the demo never looks stale. */
function day(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayIso(d)
}

const STAMP = "2026-01-05T09:00:00.000Z"

type ProjectSeed = Omit<WorkProject, "workspaceId" | "createdAt" | "updatedAt">
type MilestoneSeed = Omit<Milestone, "workspaceId" | "createdAt" | "updatedAt">
type TaskSeed = Omit<WorkTask, "workspaceId" | "createdAt" | "updatedAt" | "order" | "subtasks" | "completedAt"> & {
  subtasks?: WorkTask["subtasks"]
}

const PROJECTS: Record<string, ProjectSeed[]> = {
  ws_atlas: [
    { id: "prj_orbit", code: "ORB-01", name: "Orbit fleet portal", description: "Customer portal for tracking shipments and invoices.", clientId: "cli_orbit", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_omar", "emp_julia", "emp_noah"], status: WorkProjectStatus.ACTIVE, priority: Priority.HIGH, startDate: day(-45), dueDate: day(30), budgetType: BudgetType.FIXED, budgetAmount: 480000, taskStates: ORBIT_STATES },
    { id: "prj_helio", code: "HEL-02", name: "Helio energy dashboard", description: "Real-time production dashboard for solar sites.", clientId: "cli_helio", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_amina"], status: WorkProjectStatus.ACTIVE, priority: Priority.MEDIUM, startDate: day(-60), dueDate: day(10), budgetType: BudgetType.HOURLY, budgetAmount: 300000 },
    { id: "prj_medica", code: "MED-01", name: "Medica patient app", description: "Appointment booking app for clinics.", clientId: "cli_medica", managerId: "emp_julia", memberIds: ["emp_julia", "emp_amina", "emp_noah"], status: WorkProjectStatus.PLANNING, priority: Priority.MEDIUM, startDate: day(7), dueDate: day(90), budgetType: BudgetType.FIXED, budgetAmount: 650000 },
    { id: "prj_site", code: "INT-01", name: "Atlas website refresh", description: "Internal: new marketing site.", managerId: "emp_emma", memberIds: ["emp_emma", "emp_julia"], status: WorkProjectStatus.COMPLETED, priority: Priority.LOW, startDate: day(-120), dueDate: day(-20), budgetType: BudgetType.NON_BILLABLE },
    // Finished engagements: they carry the past year of hours and invoices the analytics read
    { id: "prj_kappa", code: "KAP-01", name: "Kappa online banking UI", description: "Customer banking portal redesign.", clientId: "cli_kappa", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_omar"], status: WorkProjectStatus.COMPLETED, priority: Priority.HIGH, startDate: day(-365), dueDate: day(-190), budgetType: BudgetType.HOURLY },
    { id: "prj_orbit_mvp", code: "ORB-00", name: "Orbit tracking MVP", description: "First release of the shipment tracker.", clientId: "cli_orbit", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_omar", "emp_julia", "emp_noah"], status: WorkProjectStatus.COMPLETED, priority: Priority.HIGH, startDate: day(-270), dueDate: day(-50), budgetType: BudgetType.HOURLY },
    { id: "prj_medica_disc", code: "MED-00", name: "Medica discovery", description: "Research and prototypes for the patient app.", clientId: "cli_medica", managerId: "emp_julia", memberIds: ["emp_julia", "emp_amina"], status: WorkProjectStatus.COMPLETED, priority: Priority.MEDIUM, startDate: day(-150), dueDate: day(-45), budgetType: BudgetType.HOURLY },
    { id: "prj_helio_audit", code: "HEL-01", name: "Helio data audit", description: "Audit of the solar sites' data sources.", clientId: "cli_helio", managerId: "emp_karim", memberIds: ["emp_karim", "emp_amina"], status: WorkProjectStatus.COMPLETED, priority: Priority.MEDIUM, startDate: day(-120), dueDate: day(-45), budgetType: BudgetType.HOURLY },
  ],
  ws_northwind: [
    { id: "prj_lumen", code: "LUM-01", name: "Lumen spring campaign", description: "Video and social assets for the spring launch.", clientId: "cli_lumen", managerId: "emp_mateo", memberIds: ["emp_mateo", "emp_chloe"], status: WorkProjectStatus.ACTIVE, priority: Priority.URGENT, startDate: day(-20), dueDate: day(-2), budgetType: BudgetType.FIXED, budgetAmount: 22000 },
    { id: "prj_lumen_brand", code: "LUM-00", name: "Lumen brand film", description: "Brand film and cut-downs.", clientId: "cli_lumen", managerId: "emp_mateo", memberIds: ["emp_mateo", "emp_chloe"], status: WorkProjectStatus.COMPLETED, priority: Priority.MEDIUM, startDate: day(-300), dueDate: day(-40), budgetType: BudgetType.HOURLY },
  ],
}

const MILESTONES: Record<string, MilestoneSeed[]> = {
  ws_atlas: [
    { id: "ms_orbit_design", projectId: "prj_orbit", title: "Design approved", dueDate: day(-20), requiresApproval: true, budgetHours: 120, budgetAmount: 90000, approvedAt: `${day(-22)}T10:00:00.000Z` },
    { id: "ms_orbit_beta", projectId: "prj_orbit", title: "Beta release", dueDate: day(10), requiresApproval: true, budgetHours: 220, budgetAmount: 200000 },
    { id: "ms_orbit_launch", projectId: "prj_orbit", title: "Launch", dueDate: day(30), requiresApproval: false, budgetHours: 80, budgetAmount: 60000 },
    { id: "ms_helio_mvp", projectId: "prj_helio", title: "MVP dashboard", dueDate: day(-5), requiresApproval: true, budgetHours: 200, budgetAmount: 250000 },
  ],
  ws_northwind: [
    { id: "ms_lumen_cut", projectId: "prj_lumen", title: "Final cut", dueDate: day(-2), requiresApproval: true },
  ],
}

const TASKS: Record<string, TaskSeed[]> = {
  ws_atlas: [
    { id: "tsk_1", projectId: "prj_orbit", milestoneId: "ms_orbit_design", title: "Wireframes for tracking pages", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeId: "emp_julia", dueDate: day(-30), estimatedHours: 16 },
    { id: "tsk_2", dependsOn: ["tsk_1"], projectId: "prj_orbit", milestoneId: "ms_orbit_design", title: "Visual design system", status: TaskStatus.DONE, priority: Priority.MEDIUM, assigneeId: "emp_julia", dueDate: day(-24), estimatedHours: 24 },
    { id: "tsk_3", dependsOn: ["tsk_2"], labelIds: ["lbl_feature"], projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Shipment tracking API", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_omar", dueDate: day(5), estimatedHours: 32, subtasks: [{ id: "st_1", title: "Carrier webhooks", done: true }, { id: "st_2", title: "Status history endpoint", done: false }] },
    { id: "tsk_4", dependsOn: ["tsk_2"], labelIds: ["lbl_design"], projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Tracking page UI", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(7), estimatedHours: 24 },
    { id: "tsk_5", labelIds: ["lbl_bug"], projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Invoice download", status: TaskStatus.REVIEW, priority: Priority.MEDIUM, assigneeId: "emp_noah", dueDate: day(3), estimatedHours: 8 },
    { id: "tsk_6", dependsOn: ["tsk_3", "tsk_4"], projectId: "prj_orbit", milestoneId: "ms_orbit_launch", title: "Load testing", status: TaskStatus.TODO, priority: Priority.MEDIUM, assigneeId: "emp_omar", dueDate: day(20), estimatedHours: 12 },
    { id: "tsk_7", dependsOn: ["tsk_4"], projectId: "prj_orbit", milestoneId: "ms_orbit_launch", title: "User guide", status: TaskStatus.TODO, priority: Priority.LOW, assigneeId: "emp_julia", dueDate: day(25), estimatedHours: 6 },
    { id: "tsk_8", projectId: "prj_helio", milestoneId: "ms_helio_mvp", title: "Site data ingestion", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(-25), estimatedHours: 20 },
    { id: "tsk_9", labelIds: ["lbl_client"], projectId: "prj_helio", milestoneId: "ms_helio_mvp", title: "Production charts", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(-3), estimatedHours: 18 },
    { id: "tsk_10", projectId: "prj_helio", milestoneId: "ms_helio_mvp", title: "Chart icons", status: TaskStatus.TODO, priority: Priority.LOW, assigneeId: "emp_amina", dueDate: day(4), estimatedHours: 6 },
    { id: "tsk_11", projectId: "prj_medica", title: "Discovery workshop", status: TaskStatus.TODO, priority: Priority.MEDIUM, assigneeId: "emp_julia", dueDate: day(10), estimatedHours: 8 },
    { id: "tsk_12", projectId: "prj_site", title: "New homepage", status: TaskStatus.DONE, priority: Priority.LOW, assigneeId: "emp_julia", dueDate: day(-30), estimatedHours: 20 },
  ],
  ws_northwind: [
    { id: "tsk_20", projectId: "prj_lumen", milestoneId: "ms_lumen_cut", title: "Shoot day", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeId: "emp_chloe", dueDate: day(-10), estimatedHours: 10 },
    { id: "tsk_21", projectId: "prj_lumen", milestoneId: "ms_lumen_cut", title: "Edit and color grade", status: TaskStatus.REVIEW, priority: Priority.URGENT, assigneeId: "emp_chloe", dueDate: day(-3), estimatedHours: 16 },
  ],
}

function stamp<T>(rows: T[], workspaceId: string) {
  return rows.map((row) => ({ ...row, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

export function seedProjects(workspaceId: string): WorkProject[] {
  return stamp(PROJECTS[workspaceId] ?? [], workspaceId)
}

export function seedMilestones(workspaceId: string): Milestone[] {
  return stamp(MILESTONES[workspaceId] ?? [], workspaceId)
}

/** Finished sample tasks land on their due date; one was two days late, so on-time KPIs have something to show. */
function completedAt(task: TaskSeed) {
  if (!task.dueDate) return STAMP
  const late = task.id === "tsk_2" ? 2 : 0
  const d = new Date(`${task.dueDate}T15:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + late)
  return d.toISOString()
}

/** More on some demo tasks: people, watchers, links, relations and a formatted description (P1) */

const TASK_EXTRAS: Record<string, Partial<WorkTask>> = {
  tsk_3: {
    collaboratorIds: ["emp_lina"],
    watcherIds: ["emp_karim"],
    description: "Expose the **tracking events** coming from the carriers.\n\n- Webhooks from each carrier\n- One _status history_ endpoint per shipment\n- See the [carrier API notes](https://developers.example.com/carriers)\n\nThe page work is in ORB-01#4.",
    links: [{ id: "lnk_1", url: "https://developers.example.com/carriers", title: "Carrier API notes" }],
    relations: [{ type: TaskRelationType.RELATES, taskId: "tsk_4" }],
  },
  tsk_4: {
    stateId: "st_orbit_waiting", collaboratorIds: ["emp_julia"], watcherIds: ["emp_karim"] },
  tsk_5: { watcherIds: ["emp_sara"], relations: [{ type: TaskRelationType.RELATES, taskId: "tsk_3" }] },
  tsk_9: { collaboratorIds: ["emp_amina"], watcherIds: ["emp_sara", "emp_karim"] },
}

export function seedTasks(workspaceId: string): WorkTask[] {
  const numbers = new Map<string, number>()
  return stamp(TASKS[workspaceId] ?? [], workspaceId).map((task, index) => ({
    ...task,
    number: numbers.set(task.projectId, (numbers.get(task.projectId) ?? 0) + 1).get(task.projectId),
    ...TASK_EXTRAS[task.id],
    subtasks: task.subtasks ?? [],
    order: index,
    completedAt: task.status === TaskStatus.DONE ? completedAt(task) : undefined,
  }))
}
