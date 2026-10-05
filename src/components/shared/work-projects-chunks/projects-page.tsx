"use client"

import { useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Calendar, FolderKanban, Plus, Search, TrendingUp } from "@/components/ui/carbon/icons"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ProjectHealth, WorkProjectStatus, type WorkProjectInput } from "@/types/work-projects"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjectMutations, useProjectTemplates, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NO_TEMPLATE = "__blank__"
import { projectStatsById, todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { ProjectCard } from "./project-card"
import { ProjectForm, type ProjectFormHandle } from "./project-form"
import { PROJECT_STATUS_LABEL } from "./project-labels"

type StatusFilter = "open" | "all" | WorkProjectStatus

const OPEN_STATUSES = [WorkProjectStatus.PLANNING, WorkProjectStatus.ACTIVE, WorkProjectStatus.ON_HOLD]

export default function ProjectsPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: projects = [], isLoading } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { create, createFromTemplate } = useProjectMutations()
  const { data: templates = [] } = useProjectTemplates()
  const [templateId, setTemplateId] = useState(NO_TEMPLATE)
  const canCreate = can(authedUser, AdminPermissionsPlatform.PROJECTS_CREATE)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open")
  const [formOpen, setFormOpen] = useState(false)
  const formRef = useRef<ProjectFormHandle>(null)

  const stats = useMemo(() => projectStatsById(projects, tasks), [projects, tasks])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      if (statusFilter === "open" && !OPEN_STATUSES.includes(p.status)) return false
      if (statusFilter !== "open" && statusFilter !== "all" && p.status !== statusFilter) return false
      if (!q) return true
      const client = clients.find((c) => c.id === p.clientId)?.name ?? ""
      return [p.name, p.code, client].some((s) => s.toLowerCase().includes(q))
    })
  }, [projects, clients, search, statusFilter])

  const cards = useMemo<MetricCardItem[]>(() => {
    const open = projects.filter((p) => OPEN_STATUSES.includes(p.status))
    const flagged = open.filter((p) => {
      const h = stats.get(p.id)?.health
      return h === ProjectHealth.AT_RISK || h === ProjectHealth.LATE
    }).length
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    const today = todayIso()
    const dueSoon = open.filter((p) => p.dueDate && p.dueDate >= today && p.dueDate <= todayIso(in30)).length
    const avg = open.length
      ? Math.round(open.reduce((sum, p) => sum + (stats.get(p.id)?.progress ?? 0), 0) / open.length)
      : 0
    return [
      { key: "open", title: t("openProjects"), value: open.length, footer: { icon: FolderKanban, text: t("planningActiveOnHold") } },
      { key: "risk", title: t("needAttention"), value: flagged, valueClassName: flagged ? "text-warning-foreground" : undefined, footer: { icon: AlertTriangle, text: t("atRiskOrLate") } },
      { key: "due", title: t("dueIn30Days"), value: dueSoon, valueClassName: "text-info-foreground", footer: { icon: Calendar, text: t("upcomingDeadlines") } },
      { key: "progress", title: t("averageProgress"), value: `${avg}%`, valueClassName: "text-primary", footer: { icon: TrendingUp, text: t("acrossOpenProjects") } },
    ]
  }, [projects, stats, t])

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "open", label: t("open") },
    ...Object.values(WorkProjectStatus).map((s) => ({ id: s, label: t(PROJECT_STATUS_LABEL[s]) })),
    { id: "all", label: t("all") },
  ]

  const handleValid = (input: WorkProjectInput) =>
    templateId === NO_TEMPLATE
      ? create.mutate(input, { onSuccess: () => setFormOpen(false) })
      : createFromTemplate.mutate({ templateId, input }, { onSuccess: () => setFormOpen(false) })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canCreate && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              {t("newProject")}
            </Button>
          )
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label={t("status")} className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-muted p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchProjects")}
              aria-label={t("searchProjects")}
              className="rounded-full ps-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-52 rounded-3xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
            <FolderKanban className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{projects.length ? t("noMatchingProjects") : t("noProjectsYet")}</p>
            {canCreate && !projects.length && (
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />
                {t("newProject")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={stats.get(project.id)!}
                client={clients.find((c) => c.id === project.clientId)}
                members={employees.filter((e) => project.memberIds.includes(e.id))}
              />
            ))}
          </div>
        )}
      </section>

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        createTitle={t("newProject")}
        editTitle={t("editProject")}
        description={t("newProjectDescription")}
        isSubmitting={create.isPending || createFromTemplate.isPending}
        onSubmit={() => formRef.current?.submit()}
      >
        {templates.length > 0 && (
          <div className="mb-4 grid gap-1.5 rounded-2xl border border-border bg-muted/40 p-3">
            <Label>{t("startFromTemplate")}</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full bg-card"><SelectValue>{templates.find((x) => x.id === templateId)?.name ?? t("blankProject")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>{t("blankProject")}</SelectItem>
                {templates.map((x) => <SelectItem key={x.id} value={x.id}>{x.name} · {t("templateSize", { tasks: x.tasks.length, days: x.durationDays })}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("startFromTemplateHint")}</p>
          </div>
        )}
        <ProjectForm
          ref={formRef}
          clients={clients}
          employees={employees}
          existingCodes={projects.map((p) => p.code)}
          currency={workspace.currency}
          onValid={handleValid}
        />
      </DataTableEntityFormSheet>
    </div>
  )
}
