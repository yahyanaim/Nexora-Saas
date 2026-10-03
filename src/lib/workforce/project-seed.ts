import {
  BudgetType,
  Priority,
  TaskStatus,
  WorkProjectStatus,
  type Milestone,
  type WorkProject,
  type WorkTask,
} from "@/types/work-projects"
import { todayIso } from "./project-metrics"

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
    { id: "prj_orbit", code: "ORB-01", name: "Orbit fleet portal", description: "Customer portal for tracking shipments and invoices.", clientId: "cli_orbit", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_omar", "emp_julia", "emp_noah"], status: WorkProjectStatus.ACTIVE, priority: Priority.HIGH, startDate: day(-45), dueDate: day(30), budgetType: BudgetType.FIXED, budgetAmount: 48000 },
    { id: "prj_helio", code: "HEL-02", name: "Helio energy dashboard", description: "Real-time production dashboard for solar sites.", clientId: "cli_helio", managerId: "emp_karim", memberIds: ["emp_karim", "emp_lina", "emp_amina"], status: WorkProjectStatus.ACTIVE, priority: Priority.MEDIUM, startDate: day(-60), dueDate: day(10), budgetType: BudgetType.HOURLY, budgetAmount: 30000 },
    { id: "prj_medica", code: "MED-01", name: "Medica patient app", description: "Appointment booking app for clinics.", clientId: "cli_medica", managerId: "emp_julia", memberIds: ["emp_julia", "emp_amina", "emp_noah"], status: WorkProjectStatus.PLANNING, priority: Priority.MEDIUM, startDate: day(7), dueDate: day(90), budgetType: BudgetType.FIXED, budgetAmount: 65000 },
    { id: "prj_site", code: "INT-01", name: "Atlas website refresh", description: "Internal: new marketing site.", managerId: "emp_emma", memberIds: ["emp_emma", "emp_julia"], status: WorkProjectStatus.COMPLETED, priority: Priority.LOW, startDate: day(-120), dueDate: day(-20), budgetType: BudgetType.NON_BILLABLE },
  ],
  ws_northwind: [
    { id: "prj_lumen", code: "LUM-01", name: "Lumen spring campaign", description: "Video and social assets for the spring launch.", clientId: "cli_lumen", managerId: "emp_mateo", memberIds: ["emp_mateo", "emp_chloe"], status: WorkProjectStatus.ACTIVE, priority: Priority.URGENT, startDate: day(-20), dueDate: day(-2), budgetType: BudgetType.FIXED, budgetAmount: 22000 },
  ],
}

const MILESTONES: Record<string, MilestoneSeed[]> = {
  ws_atlas: [
    { id: "ms_orbit_design", projectId: "prj_orbit", title: "Design approved", dueDate: day(-20), requiresApproval: true, approvedAt: `${day(-22)}T10:00:00.000Z` },
    { id: "ms_orbit_beta", projectId: "prj_orbit", title: "Beta release", dueDate: day(10), requiresApproval: true },
    { id: "ms_orbit_launch", projectId: "prj_orbit", title: "Launch", dueDate: day(30), requiresApproval: false },
    { id: "ms_helio_mvp", projectId: "prj_helio", title: "MVP dashboard", dueDate: day(-5), requiresApproval: true },
  ],
  ws_northwind: [
    { id: "ms_lumen_cut", projectId: "prj_lumen", title: "Final cut", dueDate: day(-2), requiresApproval: true },
  ],
}

const TASKS: Record<string, TaskSeed[]> = {
  ws_atlas: [
    { id: "tsk_1", projectId: "prj_orbit", milestoneId: "ms_orbit_design", title: "Wireframes for tracking pages", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeId: "emp_julia", dueDate: day(-30), estimatedHours: 16 },
    { id: "tsk_2", projectId: "prj_orbit", milestoneId: "ms_orbit_design", title: "Visual design system", status: TaskStatus.DONE, priority: Priority.MEDIUM, assigneeId: "emp_julia", dueDate: day(-24), estimatedHours: 24 },
    { id: "tsk_3", projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Shipment tracking API", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_omar", dueDate: day(5), estimatedHours: 32, subtasks: [{ id: "st_1", title: "Carrier webhooks", done: true }, { id: "st_2", title: "Status history endpoint", done: false }] },
    { id: "tsk_4", projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Tracking page UI", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(7), estimatedHours: 24 },
    { id: "tsk_5", projectId: "prj_orbit", milestoneId: "ms_orbit_beta", title: "Invoice download", status: TaskStatus.REVIEW, priority: Priority.MEDIUM, assigneeId: "emp_noah", dueDate: day(3), estimatedHours: 8 },
    { id: "tsk_6", projectId: "prj_orbit", milestoneId: "ms_orbit_launch", title: "Load testing", status: TaskStatus.TODO, priority: Priority.MEDIUM, assigneeId: "emp_omar", dueDate: day(20), estimatedHours: 12 },
    { id: "tsk_7", projectId: "prj_orbit", milestoneId: "ms_orbit_launch", title: "User guide", status: TaskStatus.TODO, priority: Priority.LOW, assigneeId: "emp_julia", dueDate: day(25), estimatedHours: 6 },
    { id: "tsk_8", projectId: "prj_helio", milestoneId: "ms_helio_mvp", title: "Site data ingestion", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(-25), estimatedHours: 20 },
    { id: "tsk_9", projectId: "prj_helio", milestoneId: "ms_helio_mvp", title: "Production charts", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeId: "emp_lina", dueDate: day(-3), estimatedHours: 18 },
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

export function seedTasks(workspaceId: string): WorkTask[] {
  return stamp(TASKS[workspaceId] ?? [], workspaceId).map((task, index) => ({
    ...task,
    subtasks: task.subtasks ?? [],
    order: index,
    completedAt: task.status === TaskStatus.DONE ? STAMP : undefined,
  }))
}
