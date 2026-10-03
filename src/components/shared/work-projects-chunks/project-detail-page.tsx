"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs } from "@/components/ui/tabs"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { ArrowLeft, FolderKanban, Pencil, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import {
  useMilestoneMutations,
  useMilestones,
  useProject,
  useProjectMutations,
  useProjects,
  useTaskMutations,
  useTasks,
} from "@/hooks/workforce/use-work-projects"
import { projectHealth, remainingHours, taskProgress } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { BudgetType, TaskStatus, type WorkTask, type WorkTaskInput } from "@/types/work-projects"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { ProjectForm, type ProjectFormHandle } from "./project-form"
import { TaskForm, type TaskFormHandle } from "./task-form"
import { TaskBoard } from "./task-board"
import { TaskList } from "./task-list"
import { MilestonesPanel } from "./milestones-panel"
import { TeamPanel } from "./team-panel"
import {
  BUDGET_TYPE_LABEL,
  HEALTH_BAR,
  HEALTH_CLASS,
  HEALTH_LABEL,
  PROJECT_STATUS_CLASS,
  PROJECT_STATUS_LABEL,
  formatShortDate,
} from "./project-labels"

export default function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()

  const { data: project, isLoading } = useProject(projectId)
  const { data: allProjects = [] } = useProjects()
  const { data: tasks = [] } = useTasks(projectId)
  const { data: milestones = [] } = useMilestones(projectId)
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const projectMutations = useProjectMutations()
  const taskMutations = useTaskMutations()
  const milestoneMutations = useMilestoneMutations()

  const canEdit = can(authedUser, AdminPermissionsPlatform.PROJECTS_UPDATE)
  const canDelete = can(authedUser, AdminPermissionsPlatform.PROJECTS_DELETE)

  const [editingProject, setEditingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [taskSheet, setTaskSheet] = useState<{ task?: WorkTask; defaults?: Partial<WorkTask> } | null>(null)
  const [deletingTask, setDeletingTask] = useState<WorkTask | null>(null)
  const projectFormRef = useRef<ProjectFormHandle>(null)
  const taskFormRef = useRef<TaskFormHandle>(null)

  const team = useMemo(
    () => employees.filter((e) => project?.memberIds.includes(e.id)),
    [employees, project?.memberIds]
  )

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card py-16 text-center shadow-panel">
          <FolderKanban className="size-8 text-muted-foreground" />
          <p className="font-medium">{t("projectNotFound")}</p>
          <p className="text-sm text-muted-foreground">{t("projectNotFoundHint")}</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="size-4" />
              {t("backToProjects")}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const client = clients.find((c) => c.id === project.clientId)
  const manager = employees.find((e) => e.id === project.managerId)
  const progress = taskProgress(tasks)
  const health = projectHealth(project, tasks)
  const done = tasks.filter((task) => task.status === TaskStatus.DONE).length

  const saveTask = (input: WorkTaskInput) => {
    const close = { onSuccess: () => setTaskSheet(null) }
    if (taskSheet?.task) taskMutations.update.mutate({ id: taskSheet.task.id, input }, close)
    else taskMutations.create.mutate(input, close)
  }

  const openTask = (task: WorkTask) => setTaskSheet({ task })
  const addTask = (status: TaskStatus = TaskStatus.TODO) => setTaskSheet({ defaults: { status } })

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: t("client"), value: client?.name ?? t("internalProject") },
    { label: t("projectManager"), value: manager?.name ?? "—" },
    {
      label: t("schedule"),
      value: `${formatShortDate(project.startDate, locale)} → ${formatShortDate(project.dueDate, locale)}`,
    },
    {
      label: t("budget"),
      value:
        project.budgetType === BudgetType.NON_BILLABLE || !project.budgetAmount
          ? t(BUDGET_TYPE_LABEL[project.budgetType])
          : `${formatMoney(project.budgetAmount, workspace.currency, locale)} · ${t(BUDGET_TYPE_LABEL[project.budgetType])}`,
    },
    { label: t("remainingWork"), value: `${remainingHours(tasks)} h` },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={project.name}
        description={project.description}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {project.code}
            </Badge>
            <Badge variant="outline" className={PROJECT_STATUS_CLASS[project.status]}>
              {t(PROJECT_STATUS_LABEL[project.status])}
            </Badge>
            <Badge variant="outline" className={HEALTH_CLASS[health]}>
              {t(HEALTH_LABEL[health])}
            </Badge>
          </span>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/projects">
                <ArrowLeft className="size-4" />
                {t("allProjects")}
              </Link>
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => setEditingProject(true)}>
                <Pencil className="size-4" />
                {t("edit")}
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" onClick={() => setDeletingProject(true)} aria-label={t("deleteProject")}>
                <Trash2 className="size-4" />
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => addTask()}>
                <Plus className="size-4" />
                {t("addTask")}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Progress value={progress} aria-label={t("progress")} className={cn("h-2.5 flex-1", HEALTH_BAR[health])} />
            <span className="text-sm font-semibold tabular-nums">{progress}%</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {t("tasksDone", { done, total: tasks.length })}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="truncate text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </PageHeader>

      <Tabs
        tabs={[
          {
            id: "board",
            label: t("board"),
            content: (
              <TaskBoard
                tasks={tasks}
                team={team}
                milestones={milestones}
                canEdit={canEdit}
                onOpen={openTask}
                onAdd={addTask}
                onMove={(id, status, index) => taskMutations.move.mutate({ id, status, index })}
              />
            ),
          },
          { id: "list", label: t("list"), content: <TaskList tasks={tasks} team={team} milestones={milestones} onOpen={openTask} /> },
          {
            id: "milestones",
            label: t("milestones"),
            content: (
              <MilestonesPanel
                projectId={project.id}
                milestones={milestones}
                tasks={tasks}
                canEdit={canEdit}
                isSaving={milestoneMutations.create.isPending}
                onCreate={(input, close) => milestoneMutations.create.mutate(input, { onSuccess: close })}
                onApprove={(id, approved) => milestoneMutations.approve.mutate({ id, approved })}
                onDelete={(id) => milestoneMutations.remove.mutate(id)}
              />
            ),
          },
          { id: "team", label: t("team"), content: <TeamPanel team={team} managerId={project.managerId} tasks={tasks} /> },
        ]}
      />

      <DataTableEntityFormSheet
        open={!!taskSheet}
        onOpenChange={(open) => !open && setTaskSheet(null)}
        mode={taskSheet?.task ? "edit" : "create"}
        createTitle={t("addTask")}
        editTitle={t("editTask")}
        description={project.name}
        isSubmitting={taskMutations.create.isPending || taskMutations.update.isPending}
        onSubmit={() => taskFormRef.current?.submit()}
      >
        <TaskForm
          ref={taskFormRef}
          projectId={project.id}
          task={taskSheet?.task ?? taskSheet?.defaults}
          team={team}
          milestones={milestones}
          onValid={saveTask}
        />
        {taskSheet?.task && canEdit && (
          <Button
            variant="ghost"
            className="mt-4 w-full text-destructive hover:bg-danger-soft hover:text-destructive"
            onClick={() => setDeletingTask(taskSheet.task!)}
          >
            <Trash2 className="size-4" />
            {t("deleteTask")}
          </Button>
        )}
      </DataTableEntityFormSheet>

      <DataTableEntityFormSheet
        open={editingProject}
        onOpenChange={setEditingProject}
        mode="edit"
        createTitle={t("newProject")}
        editTitle={t("editProject")}
        description={project.name}
        isSubmitting={projectMutations.update.isPending}
        onSubmit={() => projectFormRef.current?.submit()}
      >
        <ProjectForm
          ref={projectFormRef}
          project={project}
          clients={clients}
          employees={employees}
          existingCodes={allProjects.filter((p) => p.id !== project.id).map((p) => p.code)}
          currency={workspace.currency}
          onValid={(input) =>
            projectMutations.update.mutate({ id: project.id, input }, { onSuccess: () => setEditingProject(false) })
          }
        />
      </DataTableEntityFormSheet>

      <ConfirmAlertDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        title={t("deleteTask")}
        description={t("deleteTaskConfirmation", { name: deletingTask?.title ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={taskMutations.remove.isPending}
        onConfirm={() =>
          deletingTask &&
          taskMutations.remove.mutate(deletingTask.id, {
            onSuccess: () => {
              setDeletingTask(null)
              setTaskSheet(null)
            },
          })
        }
      />

      <ConfirmAlertDialog
        open={deletingProject}
        onOpenChange={setDeletingProject}
        title={t("deleteProject")}
        description={t("deleteProjectConfirmation", { name: project.name })}
        confirmLabel={t("delete")}
        destructive
        isLoading={projectMutations.remove.isPending}
        onConfirm={() =>
          projectMutations.remove.mutate(project.id, { onSuccess: () => router.push("/dashboard/projects") })
        }
      />
    </div>
  )
}
