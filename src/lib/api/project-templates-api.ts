import { createCollection } from "@/lib/workforce/demo-store"
import { recordAudit } from "@/lib/workforce/audit"
import { scheduleTemplate, templateFromProject } from "@/lib/workforce/scheduling"
import { BudgetType, Priority, TaskStatus, type ProjectTemplate, type WorkProject, type WorkProjectInput } from "@/types/work-projects"
import { createMilestoneApi, createProjectApi, createTaskApi, listMilestonesApi, listProjectsApi, listTasksApi } from "./work-projects-api"

const STAMP = "2026-01-01T00:00:00.000Z"

function seedTemplates(workspaceId: string): ProjectTemplate[] {
  if (workspaceId !== "ws_atlas") return []
  const t = (key: string, title: string, estimatedHours: number, startOffset: number, dueOffset: number, dependsOn: string[] = [], milestoneKey?: string) =>
    ({ key, title, estimatedHours, priority: Priority.MEDIUM, startOffset, dueOffset, dependsOn, milestoneKey })
  return [
    {
      id: "tpl_web", workspaceId, name: "Website build", description: "Discovery, design, build and launch of a marketing website.", budgetType: BudgetType.FIXED, durationDays: 49,
      milestones: [
        { key: "m1", title: "Design approved", dueOffset: 14, requiresApproval: true },
        { key: "m2", title: "Launch", dueOffset: 49, requiresApproval: true },
      ],
      tasks: [
        t("k1", "Kick-off and discovery workshop", 8, 0, 2),
        t("k2", "Sitemap and wireframes", 16, 3, 7, ["k1"], "m1"),
        t("k3", "Visual design", 32, 8, 14, ["k2"], "m1"),
        t("k4", "Front-end build", 60, 15, 35, ["k3"], "m2"),
        t("k5", "Content entry and SEO", 16, 30, 40, ["k3"], "m2"),
        t("k6", "QA and launch", 12, 41, 49, ["k4", "k5"], "m2"),
      ],
      createdAt: STAMP, updatedAt: STAMP,
    },
  ]
}

/**
 * Project templates (PRJ-2). Browser demo store for now; replace the bodies
 * with apiClient calls once the backend exists.
 */
const templates = createCollection<ProjectTemplate>("project-templates", "tpl", seedTemplates)

export async function listTemplatesApi(workspaceId: string): Promise<ProjectTemplate[]> {
  return templates.list(workspaceId)
}

export async function saveProjectAsTemplateApi(workspaceId: string, projectId: string, name: string): Promise<ProjectTemplate> {
  if (!name.trim()) throw new Error("Give the template a name")
  if (templates.list(workspaceId).some((x) => x.name.toLowerCase() === name.trim().toLowerCase())) throw new Error("A template with this name already exists")
  const project = (await listProjectsApi(workspaceId)).find((p) => p.id === projectId)
  if (!project) throw new Error("Project not found")
  const data = templateFromProject(project, await listTasksApi(workspaceId, projectId), await listMilestonesApi(workspaceId, projectId), name)
  const saved = templates.create(workspaceId, data)
  recordAudit(workspaceId, { action: "Project template saved", actionKey: "project.template", category: "Settings", target: saved.name })
  return saved
}

export async function deleteTemplateApi(workspaceId: string, id: string) {
  templates.remove(workspaceId, id)
}

/** Creates a project with the template's milestones and tasks, dated from its start (PRJ-2). */
export async function createProjectFromTemplateApi(workspaceId: string, templateId: string, input: WorkProjectInput): Promise<WorkProject> {
  const template = templates.get(workspaceId, templateId)
  if (!template) throw new Error("Template not found")
  const plan = scheduleTemplate(template, input.startDate)
  const project = await createProjectApi(workspaceId, { ...input, dueDate: input.dueDate ?? plan.dueDate })
  const msIds = new Map<string, string>()
  for (const m of plan.milestones) {
    const created = await createMilestoneApi(workspaceId, { projectId: project.id, title: m.title, dueDate: m.dueDate, requiresApproval: m.requiresApproval })
    msIds.set(m.key, created.id)
  }
  // Tasks are created in dependency order so each predecessor already has its id
  const taskIds = new Map<string, string>()
  const pending = [...plan.tasks]
  while (pending.length) {
    const i = pending.findIndex((t) => t.dependsOn.every((k) => taskIds.has(k)))
    const t = pending.splice(i < 0 ? 0 : i, 1)[0]!
    const created = await createTaskApi(workspaceId, {
      projectId: project.id,
      title: t.title,
      status: TaskStatus.TODO,
      priority: t.priority,
      estimatedHours: t.estimatedHours,
      startDate: t.startDate,
      dueDate: t.dueDate,
      milestoneId: t.milestoneKey ? msIds.get(t.milestoneKey) : undefined,
      dependsOn: t.dependsOn.map((k) => taskIds.get(k)).filter((x): x is string => !!x),
      subtasks: [],
    })
    taskIds.set(t.key, created.id)
  }
  recordAudit(workspaceId, { action: "Project created from template", actionKey: "project.from_template", category: "Settings", target: `${project.code} · ${template.name}` })
  return project
}
