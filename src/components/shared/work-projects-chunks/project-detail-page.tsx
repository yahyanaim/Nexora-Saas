"use client"

import { useSupplierBills } from "@/hooks/workforce/use-supplier-bills"
import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs } from "@/components/ui/tabs"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { ArrowLeft, Copy, FolderKanban, Lock, Pencil, Plus, Trash2 } from "@/components/ui/carbon/icons"
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
import { automaticHealth, projectHealth, remainingHours, taskProgress } from "@/lib/workforce/project-metrics"
import { budgetUsage } from "@/lib/workforce/profitability"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useClientInvoices, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { billedAgainstBudget } from "@/lib/workforce/invoice-builders"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { TaskDiscussion } from "./task-discussion"
import { TaskFilters, NO_FILTERS, applyTaskFilters, type TaskFilterValues } from "./task-filters"
import { HealthOverrideDialog } from "./health-override-dialog"
import { cn } from "@/lib/utils"
import { BudgetType, TaskStatus, type WorkTask, type WorkTaskInput } from "@/types/work-projects"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { ProjectForm, type ProjectFormHandle } from "./project-form"
import { TaskForm, type TaskFormHandle } from "./task-form"
import { ProjectGantt } from "./project-gantt"
import { CloseProjectDialog, ClosedProjectSummary, SaveTemplateDialog } from "./project-close"
import { CustomFieldValuesList } from "../workforce-chunks/custom-fields"
import { dependencyIssues } from "@/lib/workforce/scheduling"
import { todayIso } from "@/lib/workforce/project-metrics"
import { TaskBoard } from "./task-board"
import { TaskList } from "./task-list"
import { MilestonesPanel } from "./milestones-panel"
import { BudgetPanel } from "./budget-panel"
import { useChangeOrders } from "@/hooks/workforce/use-change-orders"
import { revisedBudget, withChanges } from "@/lib/workforce/phase-budgets"
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
  const { data: settings } = useWorkspaceSettings()
  const { data: entries = [] } = useTimeEntries()
  const { data: invoices = [] } = useClientInvoices()
  const { data: expenses = [] } = useExpenses()
  const { data: bills = [] } = useSupplierBills()
  const { data: changeOrders = [] } = useChangeOrders(projectId)
  const labels = settings?.taskLabels ?? []
  const [filters, setFilters] = useState<TaskFilterValues>(NO_FILTERS)
  const [healthDialog, setHealthDialog] = useState(false)
  const [closing, setClosing] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

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
  const budget = budgetUsage(project, { entries, expenses, employees, clients, bills, changeOrders })
  const visibleTasks = applyTaskFilters(tasks, filters)

  const saveTask = (input: WorkTaskInput) => {
    const close = { onSuccess: () => setTaskSheet(null) }
    if (taskSheet?.task) taskMutations.update.mutate({ id: taskSheet.task.id, input }, close)
    else taskMutations.create.mutate(input, close)
  }

  const openTask = (task: WorkTask) => setTaskSheet({ task })
  // Late or overlapping predecessors, as one sentence per task (PRJ-6)
  const depWarnings = Object.fromEntries(
    tasks
      .map((task) => [task.id, dependencyIssues(task, tasks, project.startDate, todayIso()).filter((i) => i.kind !== "waiting")] as const)
      .filter(([, issues]) => issues.length > 0)
      .map(([id, issues]) => [id, issues.map((i) => t(i.kind === "late" ? "depLate" : "depOverlaps", { task: i.predecessor.title })).join(" ")])
  )
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
          : revisedBudget(project, changeOrders) !== project.budgetAmount
            ? `${formatMoney(revisedBudget(project, changeOrders), workspace.currency, locale)} · ${t("pbWithChanges")}`
            : `${formatMoney(project.budgetAmount, workspace.currency, locale)} · ${t(BUDGET_TYPE_LABEL[project.budgetType])}`,
    },
    project.budgetType === BudgetType.FIXED && project.budgetAmount
      ? (() => {
          const billed = billedAgainstBudget(withChanges(project, changeOrders), invoices)
          return { label: t("billedSoFar"), value: `${formatMoney(billed.billed, workspace.currency, locale)} · ${billed.percent ?? 0}%` }
        })()
      : project.budgetType === BudgetType.RETAINER && project.retainer
        ? { label: t("retainer"), value: t("retainerShort", { amount: formatMoney(project.retainer.monthlyAmount, workspace.currency, locale), hours: project.retainer.includedHours }) }
        : { label: t("remainingWork"), value: `${remainingHours(tasks)} h` },
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
            {canEdit ? (
              <button type="button" onClick={() => setHealthDialog(true)} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Badge variant="outline" className={cn(HEALTH_CLASS[health], "cursor-pointer")}>
                  {t(HEALTH_LABEL[health])}
                  {project.healthOverride && <span className="ms-1 opacity-70">· {t("manual")}</span>}
                </Badge>
              </button>
            ) : (
              <Badge variant="outline" className={HEALTH_CLASS[health]}>
                {t(HEALTH_LABEL[health])}
              </Badge>
            )}
            {budget.alert !== "none" && (
              <Badge variant="outline" className={budget.alert === "over" ? "bg-danger-soft text-destructive border-transparent" : "bg-warning-soft text-warning-foreground border-transparent"}>
                {t(budget.alert === "over" ? "budgetOver" : "budgetWarning", { percent: budget.percent ?? 0 })}
              </Badge>
            )}
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
              <Button variant="outline" onClick={() => setSavingTemplate(true)}>
                <Copy className="size-4" />
                {t("saveAsTemplate")}
              </Button>
            )}
            {canEdit && !project.closedAt && (
              <Button variant="outline" onClick={() => setClosing(true)}>
                <Lock className="size-4" />
                {t("closeProject")}
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
          {project.healthOverride && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {t("healthOverrideNote", { name: project.healthOverride.setBy, reason: project.healthOverride.reason })}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="truncate text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <CustomFieldValuesList entity="project" values={project.customFields} />
        </div>
      </PageHeader>

      <ClosedProjectSummary project={project} canEdit={canEdit} />

      <Tabs
        tabs={[
          {
            id: "board",
            label: t("board"),
            content: (
              <>
              <TaskFilters userId={authedUser?.id ?? "me"} team={team} labels={labels} value={filters} onChange={setFilters} />
              <TaskBoard
                tasks={visibleTasks}
                labels={labels}
                team={team}
                milestones={milestones}
                canEdit={canEdit}
                onOpen={openTask}
                onAdd={addTask}
                onMove={(id, status, index) => taskMutations.move.mutate({ id, status, index })}
                warnings={depWarnings}
              />
              </>
            ),
          },
          {
            id: "list",
            label: t("list"),
            content: (
              <>
                <TaskFilters userId={authedUser?.id ?? "me"} team={team} labels={labels} value={filters} onChange={setFilters} />
                <TaskList tasks={visibleTasks} team={team} milestones={milestones} onOpen={openTask} warnings={depWarnings} />
              </>
            ),
          },
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
          {
            id: "gantt",
            label: t("gantt"),
            content: (
              <ProjectGantt
                project={project}
                tasks={tasks}
                milestones={milestones}
                team={team}
                canEdit={canEdit}
                onOpen={openTask}
                onReschedule={(id, dates) => taskMutations.update.mutate({ id, input: dates })}
              />
            ),
          },
          {
            id: "budget",
            label: t("pbTab"),
            content: (
              <BudgetPanel
                project={project}
                milestones={milestones}
                tasks={tasks}
                entries={entries}
                employees={employees}
                clients={clients}
                currency={workspace.currency}
                canEdit={canEdit}
                deciderName={authedUser?.name || t("admin")}
                onSetPhaseBudget={(id, input, close) => milestoneMutations.update.mutate({ id, input }, { onSuccess: close })}
              />
            ),
          },
          { id: "team", label: t("team"), content: <TeamPanel team={team} managerId={project.managerId} tasks={tasks} /> },
        ]}
      />

      <CloseProjectDialog
        open={closing}
        onOpenChange={setClosing}
        project={project}
        tasks={tasks}
        milestones={milestones}
        entries={entries}
        invoices={invoices}
        expenses={expenses}
        employees={employees}
        clients={clients}
        currency={workspace.currency}
      />
      {savingTemplate && <SaveTemplateDialog project={project} open={savingTemplate} onOpenChange={setSavingTemplate} />}

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
          labels={labels}
          projectTasks={tasks}
          onValid={saveTask}
        />
        {taskSheet?.task && <TaskDiscussion key={taskSheet.task.id} taskId={taskSheet.task.id} team={team} labels={labels} />}
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

      {healthDialog && (
        <HealthOverrideDialog project={project} automatic={automaticHealth(project, tasks)} open={healthDialog} onOpenChange={setHealthDialog} />
      )}

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
