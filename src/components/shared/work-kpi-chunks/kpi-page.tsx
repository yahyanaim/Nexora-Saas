"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Gauge, Information, Lock, Settings, Flag, Star, TrendingUp } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/utils/toast"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useSatisfaction } from "@/hooks/workforce/use-satisfaction"
import { satisfactionStats } from "@/lib/workforce/satisfaction"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateKpiSettingsApi } from "@/lib/api/settings-api"
import { can } from "@/lib/permissions/can"
import { DEFAULT_KPI_SETTINGS, canSeeIndividual, employeeKpis, kpiLight, periodRange, teamKpis, type KpiPeriod, type Light } from "@/lib/workforce/kpis"
import { AdminPermissionsPlatform } from "@/types/roles"
import { EmployeeStatus } from "@/types/workforce"
import type { KpiKey, KpiSettings, KpiVisibility } from "@/types/work-settings"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { translateError } from "@/lib/errors/translate-error"

const KEYS: KpiKey[] = ["utilization", "onTime", "estimateAccuracy", "revenue"]
const LIGHT_CLASS: Record<Light, string> = {
  green: "bg-success-soft text-success-foreground",
  amber: "bg-warning-soft text-warning-foreground",
  red: "bg-danger-soft text-destructive",
  none: "bg-muted text-muted-foreground",
}
const DOT: Record<Light, string> = { green: "bg-success-foreground", amber: "bg-warning-foreground", red: "bg-destructive", none: "bg-muted-foreground/40" }

/** KPIs per person against targets, with traffic lights and per-KPI visibility (KPI-1…KPI-6, KPI-11, KPI-12). */
export default function KpiPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const qc = useQueryClient()
  const { authedUser } = useAuthGuard()
  const currentEmployee = useCurrentEmployee()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: entries = [] } = useTimeEntries()
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: clients = [] } = useClients()
  const { data: leave = [] } = useLeave()
  const { data: responses = [] } = useSatisfaction()
  const { data: settings } = useWorkspaceSettings()
  const [period, setPeriod] = useState<KpiPeriod>("month")
  const [editing, setEditing] = useState<KpiSettings | null>(null)

  const kpi = settings?.kpi ?? DEFAULT_KPI_SETTINGS
  const isAdmin = can(authedUser, AdminPermissionsPlatform.ROLES_UPDATE)
  const me = currentEmployee
  const viewer = { employeeId: me?.id, isAdmin }
  const { from, to } = periodRange(period)
  const holidays = useMemo(() => settings?.holidays.map((h) => h.date) ?? [], [settings])

  const rows = useMemo(
    () =>
      employees
        .filter((e) => e.status !== EmployeeStatus.INACTIVE)
        .map((e) => ({ employee: e, k: employeeKpis(e, { entries, tasks, projects, clients, leave, holidays }, from, to) })),
    [employees, entries, tasks, projects, clients, leave, holidays, from, to]
  )
  const team = teamKpis(rows.map((r) => r.k))
  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const value = (key: KpiKey, k: (typeof rows)[number]["k"]) => (key === "revenue" ? k.revenue : k[key])
  const show = (key: KpiKey, v: number | null) => (v === null ? "—" : key === "revenue" ? money(v) : `${v}%`)
  const teamValue: Record<KpiKey, number | null> = {
    utilization: team.utilization,
    onTime: team.onTime,
    estimateAccuracy: (() => {
      const xs = rows.map((r) => r.k.estimateAccuracy).filter((x): x is number => x !== null)
      return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null
    })(),
    revenue: team.revenuePerPerson,
  }

  const save = useMutation({
    mutationFn: (s: KpiSettings) => updateKpiSettingsApi(workspace.id, s),
    onSuccess: () => {
      toast.success(t("settingsSaved"))
      qc.invalidateQueries({ queryKey: ["settings", workspace.id] })
      setEditing(null)
    },
    onError: (e) => toast.error(translateError(e, t)),
  })

  const cards: MetricCardItem[] = KEYS.map((key) => {
    const light = kpiLight(teamValue[key], kpi.targets[key])
    return {
      key,
      title: t(`kpi_${key}`),
      value: show(key, teamValue[key]),
      valueClassName: light === "green" ? "text-success-foreground" : light === "amber" ? "text-warning-foreground" : light === "red" ? "text-destructive" : undefined,
      footer: { icon: key === "revenue" ? TrendingUp : Flag, text: t("kpiTarget", { value: show(key, kpi.targets[key]) }) },
    }
  })

  // Client satisfaction from the portal surveys (Phase 6h.2), all time
  const csat = satisfactionStats(responses)
  const satisfactionCards: MetricCardItem[] = [
    { key: "csat", title: t("csatKpi"), value: csat.average === null ? "—" : `${csat.average} / 5`, valueClassName: csat.average !== null && csat.average < 3.5 ? "text-warning-foreground" : undefined, footer: { icon: Star, text: t("csatKpiHint", { count: csat.count }) } },
    { key: "nps", title: t("csatNps"), value: csat.nps === null ? "—" : csat.nps > 0 ? `+${csat.nps}` : csat.nps, valueClassName: csat.nps !== null && csat.nps < 0 ? "text-destructive" : undefined, footer: { icon: Star, text: t("csatNpsHint", { promoters: csat.promoters, detractors: csat.detractors }) } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <>
            <Select value={period} onValueChange={(v) => setPeriod(v as KpiPeriod)}>
              <SelectTrigger className="w-44 bg-card" aria-label={t("period")}><SelectValue>{t(`kpiPeriod_${period}`)}</SelectValue></SelectTrigger>
              <SelectContent>{(["month", "30d", "quarter"] as KpiPeriod[]).map((p) => <SelectItem key={p} value={p}>{t(`kpiPeriod_${p}`)}</SelectItem>)}</SelectContent>
            </Select>
            {isAdmin && (
              <Button variant="outline" onClick={() => setEditing(kpi)}>
                <Settings className="size-4" /> {t("kpiSettings")}
              </Button>
            )}
          </>
        }
      />
      <MetricCardGrid cards={[...cards, ...satisfactionCards]} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><Gauge className="size-4" /> {t("kpiPerPerson")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("kpiPerPersonHint")}</p>
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-start font-medium">{t("employee")}</th>
                  {KEYS.map((key) => (
                    <th key={key} className="px-4 py-3 text-end font-medium">
                      <span className="inline-flex items-center gap-1" title={t(`kpiFormula_${key}`)}>
                        {t(`kpi_${key}`)} <Information className="size-3.5" aria-label={t(`kpiFormula_${key}`)} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ employee, k }) => (
                  <tr key={employee.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <SpaceAvatar name={employee.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{employee.name}{employee.id === me?.id ? ` · ${t("you")}` : ""}</span>
                          <span className="block truncate text-xs text-muted-foreground">{employee.jobTitle}</span>
                        </span>
                      </span>
                    </td>
                    {KEYS.map((key) => {
                      if (!canSeeIndividual(key, viewer, employee.id, employees, kpi)) {
                        return (
                          <td key={key} className="px-4 py-3 text-end text-muted-foreground" title={t("kpiHidden")}>
                            <Lock className="ms-auto size-3.5" aria-label={t("kpiHidden")} />
                          </td>
                        )
                      }
                      const v = value(key, k)
                      const light = kpiLight(v, kpi.targets[key])
                      return (
                        <td key={key} className="px-4 py-3 text-end">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 tabular-nums", LIGHT_CLASS[light])}>
                            <span className={cn("size-1.5 rounded-full", DOT[light])} aria-hidden />
                            {show(key, v)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", DOT.green)} />{t("kpiLightGreen")}</span>
          <span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", DOT.amber)} />{t("kpiLightAmber")}</span>
          <span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", DOT.red)} />{t("kpiLightRed")}</span>
          <span className="flex items-center gap-1.5"><Lock className="size-3" />{t("kpiHidden")}</span>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("kpiSettings")}</DialogTitle>
            <DialogDescription>{t("kpiSettingsHint")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              {/* Column titles once, on wide screens; each field keeps its own label for screen readers and phones */}
              <div className="hidden grid-cols-[minmax(0,1fr)_8rem_minmax(0,17rem)] gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
                <span>{t("kpiIndicator")}</span>
                <span>{t("target")}</span>
                <span>{t("kpiWhoSees")}</span>
              </div>
              {KEYS.map((key) => (
                <div key={key} className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,17rem)] sm:items-center sm:gap-3">
                  <Label htmlFor={`kpi-target-${key}`} className="text-sm font-medium">{t(`kpi_${key}`)}</Label>
                  <div className="relative">
                    <Input
                      id={`kpi-target-${key}`}
                      type="number"
                      min={0}
                      max={key === "revenue" ? undefined : 200}
                      className="pe-12 text-end tabular-nums"
                      aria-label={`${t(`kpi_${key}`)} · ${key === "revenue" ? t("kpiTargetAmount") : t("kpiTargetPercent")}`}
                      value={editing.targets[key]}
                      onChange={(e) => setEditing({ ...editing, targets: { ...editing.targets, [key]: Number(e.target.value) } })}
                    />
                    <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted-foreground">{key === "revenue" ? workspace.currency : "%"}</span>
                  </div>
                  <Select value={editing.visibility[key]} onValueChange={(v) => setEditing({ ...editing, visibility: { ...editing.visibility, [key]: v as KpiVisibility } })}>
                    <SelectTrigger className="w-full min-w-0 bg-card" aria-label={`${t(`kpi_${key}`)} · ${t("kpiWhoSees")}`}>
                      <SelectValue><span className="block truncate">{t(`kpiVis_${editing.visibility[key]}`)}</span></SelectValue>
                    </SelectTrigger>
                    <SelectContent>{(["self", "manager", "everyone"] as KpiVisibility[]).map((v) => <SelectItem key={v} value={v}>{t(`kpiVis_${v}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t("kpiVisibilityNote")}</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
            <Button disabled={save.isPending} onClick={() => editing && save.mutate(editing)}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
