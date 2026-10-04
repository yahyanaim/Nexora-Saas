"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Search, TreePalm, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useDepartments, useEmployees } from "@/hooks/workforce/use-workforce"
import { useLeave } from "@/hooks/workforce/use-leave"
import { buildOrgTree, chainOfCommand, type OrgNode } from "@/lib/workforce/org-chart"
import { LeaveStatus } from "@/types/work-planning"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { EmployeeStatus, type Department, type Employee } from "@/types/workforce"
import { EmployeeProfileSheet } from "../workforce-chunks/employee-profile-sheet"

const ALL = "__all__"

interface ViewProps {
  collapsed: Set<string>
  toggle: (id: string) => void
  highlight: Set<string>
  match: Set<string>
  dim: (e: Employee) => boolean
  away: Set<string>
  department: (e: Employee) => Department | undefined
  onOpen: (e: Employee) => void
}

/** Reporting lines of the whole company (HR-8), built from each person's manager. */
export default function OrgChartPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: departments = [] } = useDepartments()
  const { data: leave = [] } = useLeave()
  const canEdit = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_UPDATE)
  const canSeeCosts = can(authedUser, AdminPermissionsPlatform.COSTS_READ)

  const [query, setQuery] = useState("")
  const [departmentId, setDepartmentId] = useState(ALL)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<Employee | null>(null)

  const people = useMemo(() => employees.filter((e) => e.status !== EmployeeStatus.INACTIVE), [employees])
  const tree = useMemo(() => buildOrgTree(people), [people])
  const today = todayIso()
  const away = useMemo(
    () => new Set(leave.filter((r) => r.status === LeaveStatus.APPROVED && r.startDate <= today && r.endDate >= today).map((r) => r.employeeId)),
    [leave, today]
  )

  const q = query.trim().toLowerCase()
  const match = useMemo(
    () => new Set(q ? people.filter((e) => `${e.name} ${e.jobTitle}`.toLowerCase().includes(q)).map((e) => e.id) : []),
    [people, q]
  )
  // Matches and their managers stay visible and highlighted
  const highlight = useMemo(() => new Set([...match].flatMap((id) => chainOfCommand(people, id))), [match, people])
  const visibleCollapsed = useMemo(() => new Set([...collapsed].filter((id) => !highlight.has(id) || match.has(id))), [collapsed, highlight, match])

  const managers = people.filter((e) => people.some((r) => r.managerId === e.id)).length
  const spans = people.map((e) => people.filter((r) => r.managerId === e.id).length).filter((n) => n > 0)
  const depth = (nodes: OrgNode[]): number => nodes.reduce((m, n) => Math.max(m, 1 + depth(n.reports)), 0)
  const cards: MetricCardItem[] = [
    { key: "people", title: t("orgPeople"), value: people.length, footer: { icon: Users, text: t("orgPeopleHint") } },
    { key: "managers", title: t("orgManagers"), value: managers, footer: { icon: Users, text: t("orgManagersHint") } },
    { key: "span", title: t("orgSpan"), value: spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : 0, footer: { icon: Users, text: t("orgSpanHint") } },
    { key: "levels", title: t("orgLevels"), value: depth(tree), footer: { icon: TreePalm, text: t("orgLevelsHint", { count: away.size }) } },
  ]

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allManagers = people.filter((e) => people.some((r) => r.managerId === e.id)).map((e) => e.id)

  const view: ViewProps = {
    collapsed: visibleCollapsed,
    toggle,
    highlight,
    match,
    dim: (e) => (departmentId !== ALL && e.departmentId !== departmentId) || (q !== "" && !highlight.has(e.id)),
    away,
    department: (e) => departments.find((d) => d.id === e.departmentId),
    onOpen: setViewing,
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-3 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("orgSearch")} className="ps-9" aria-label={t("orgSearch")} />
          </div>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-48 bg-card" aria-label={t("department")}>
              <SelectValue>{departmentId === ALL ? t("allDepartments") : departments.find((d) => d.id === departmentId)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allDepartments")}</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set())}>{t("expandAll")}</Button>
            <Button variant="outline" size="sm" onClick={() => setCollapsed(new Set(allManagers))}>{t("collapseAll")}</Button>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : tree.length === 0 ? (
          <EmptyState icon={Users} title={t("orgEmpty")} hint={t("orgEmptyHint")} />
        ) : (
          <>
            {q && match.size === 0 && <p className="mb-3 text-sm text-muted-foreground">{t("orgNoMatch")}</p>}
            {/* Tablet and desktop: classic top-down chart, scrolls sideways when wide */}
            <div className="org-tree hidden overflow-x-auto pb-4 md:block">
              <ul className="org-level">
                {tree.map((node) => <TreeNode key={node.employee.id} node={node} view={view} />)}
              </ul>
            </div>
            {/* Phones: indented list */}
            <ul className="flex flex-col gap-1.5 md:hidden">
              {tree.map((node) => <ListNode key={node.employee.id} node={node} view={view} />)}
            </ul>
          </>
        )}
        <style>{ORG_CSS}</style>
      </section>

      <EmployeeProfileSheet
        employee={viewing}
        employees={employees}
        departments={departments}
        currency={workspace.currency}
        canSeeCosts={canSeeCosts}
        canEditRates={false}
        canSeeDocuments={canEdit}
        onOpenChange={(open) => !open && setViewing(null)}
        onSelect={setViewing}
      />
    </div>
  )
}

function PersonCard({ node, view, compact }: { node: OrgNode; view: ViewProps; compact?: boolean }) {
  const t = useTranslations()
  const e = node.employee
  const dept = view.department(e)
  const open = !view.collapsed.has(e.id)
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border bg-card text-start transition-all",
        compact ? "w-full p-2.5" : "w-56 p-3 shadow-sm",
        view.match.has(e.id) ? "border-primary ring-2 ring-primary/25" : view.highlight.has(e.id) ? "border-primary/40" : "border-border",
        view.dim(e) && "opacity-40"
      )}
    >
      <button type="button" onClick={() => view.onOpen(e)} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={e.name}>
        <SpaceAvatar name={e.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{e.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{e.jobTitle}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {dept && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{dept.name}</span>}
            {view.away.has(e.id) && (
              <span className="flex items-center gap-0.5 rounded-full bg-info-soft px-1.5 py-0.5 text-[10px] text-info-foreground">
                <TreePalm className="size-3" />
                {t("orgAway")}
              </span>
            )}
          </span>
        </span>
      </button>
      {node.reports.length > 0 && (
        <button
          type="button"
          onClick={() => view.toggle(e.id)}
          aria-expanded={open}
          aria-label={t(open ? "collapse" : "expand")}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3 rtl:rotate-180" />}
          {node.teamSize}
        </button>
      )}
    </div>
  )
}

function TreeNode({ node, view }: { node: OrgNode; view: ViewProps }) {
  const open = !view.collapsed.has(node.employee.id)
  return (
    <li className="org-item">
      <PersonCard node={node} view={view} />
      {open && node.reports.length > 0 && (
        <ul className="org-level">
          {node.reports.map((r) => <TreeNode key={r.employee.id} node={r} view={view} />)}
        </ul>
      )}
    </li>
  )
}

function ListNode({ node, view }: { node: OrgNode; view: ViewProps }) {
  const open = !view.collapsed.has(node.employee.id)
  return (
    <li>
      <PersonCard node={node} view={view} compact />
      {open && node.reports.length > 0 && (
        <ul className="ms-4 mt-1.5 flex flex-col gap-1.5 border-s-2 border-border ps-3">
          {node.reports.map((r) => <ListNode key={r.employee.id} node={r} view={view} />)}
        </ul>
      )}
    </li>
  )
}

/* Connector lines for the top-down chart: each level is a row, each item draws its half of the bar above it. */
const ORG_CSS = `
.org-tree .org-level{display:flex;justify-content:center;gap:0;padding-top:24px;position:relative;margin:0 auto;width:max-content;min-width:100%}
.org-tree > .org-level{padding-top:0}
.org-tree .org-level .org-level::before{content:"";position:absolute;top:0;left:50%;height:24px;border-left:2px solid var(--border)}
.org-tree .org-item{display:flex;flex-direction:column;align-items:center;position:relative;padding:24px 8px 0}
.org-tree > .org-level > .org-item{padding-top:0}
.org-tree .org-item::before,.org-tree .org-item::after{content:"";position:absolute;top:0;width:50%;height:24px;border-top:2px solid var(--border)}
.org-tree .org-item::before{right:50%}
.org-tree .org-item::after{left:50%;border-left:2px solid var(--border)}
.org-tree .org-item:only-child::before,.org-tree .org-item:only-child::after{display:none}
.org-tree .org-item:only-child{padding-top:24px}
.org-tree .org-item:only-child > div:first-child::before{content:"";position:absolute;top:-24px;left:50%;height:24px;border-left:2px solid var(--border)}
.org-tree .org-item:first-child::before,.org-tree .org-item:last-child::after{border:0 none}
.org-tree .org-item:last-child::before{border-right:2px solid var(--border);border-radius:0 10px 0 0}
.org-tree .org-item:first-child::after{border-radius:10px 0 0 0}
.org-tree > .org-level > .org-item::before,.org-tree > .org-level > .org-item::after{display:none}
.org-tree > .org-level > .org-item:only-child{padding-top:0}
.org-tree > .org-level > .org-item:only-child > div:first-child::before{display:none}
`
