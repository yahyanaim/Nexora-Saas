"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRight, DatabaseBackup, MoreHorizontal } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useBackups, useIncidents, useOpsMutations, useServiceHealth, useTenantErrors } from "@/hooks/platform/use-platform-ops"
import { consoleCan } from "@/lib/platform/console-roles"
import { THRESHOLDS, isOpenIncident, overallState } from "@/lib/platform/ops-rules"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C } from "@/types/platform-console"
import { Panel } from "./billing-shared"
import { IncidentStatusBadge, ResultBadge, SERVICE_ICON, ServiceStateBadge, SeverityBadge, useMinutes } from "./ops-shared"
import { useSupportFormat } from "./support-shared"

/** Health of every service, errors per company and backups (INC-01, INC-02, INC-05, INC-06). */
export default function ConsoleHealthPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { dateTime } = useSupportFormat()
  const minutes = useMinutes()
  const actor = useConsoleActor()
  const { data: tiles = [], isLoading } = useServiceHealth()
  const { data: tenants = [] } = useTenantErrors()
  const { data: incidents = [] } = useIncidents()
  const { data: runs = [] } = useBackups()
  const m = useOpsMutations()
  const [now] = useState(() => Date.now())
  const canManage = consoleCan(actor?.role, C.INCIDENTS)
  const overall = overallState(tiles)
  const open = incidents.filter(isOpenIncident)
  const lastRestore = runs.find((r) => r.kind === "restore_test")
  const num = (n: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
  const sinceMinutes = (iso: string) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={canManage ? <Button variant="outline" onClick={() => m.restoreTest.mutate(undefined)} disabled={m.restoreTest.isPending}><DatabaseBackup className="size-4" />{t("bkRunRestore")}</Button> : undefined} />

      <div role="status" className={cn("flex flex-wrap items-center gap-3 rounded-3xl border p-4 md:p-5", overall === "ok" ? "border-success/30 bg-success-soft" : overall === "degraded" ? "border-warning/40 bg-warning-soft" : "border-destructive/30 bg-danger-soft")}>
        <ServiceStateBadge state={overall} />
        <p className="min-w-0 flex-1 text-sm font-medium">{t(`opsOverall_${overall}`)}</p>
        {open.length > 0 && <Button size="sm" variant="outline" asChild className="bg-card"><Link href="/dashboard/incidents">{t("opsOpenIncidents", { n: open.length })}<ArrowRight className="size-4 rtl:rotate-180" /></Link></Button>}
      </div>

      {isLoading ? <ListSkeleton /> : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={t("opsServices")}>
          {tiles.map((h) => {
            const Icon = SERVICE_ICON[h.service]
            return (
              <li key={h.id} className={cn("rounded-3xl border bg-card p-4 shadow-panel md:p-5", h.state === "down" ? "border-destructive/50" : h.state === "degraded" ? "border-warning/50" : "border-border")}>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-muted"><Icon className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{t(`opsSvc_${h.service}`)}</h2>
                    <p className="text-xs text-muted-foreground">{t(`opsSvcHint_${h.service}`)}</p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label={t("opsSimulateFor", { service: t(`opsSvc_${h.service}`) })}><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => m.simulate.mutate({ service: h.service, state: "degraded" })}>{t("opsSimDegraded")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => m.simulate.mutate({ service: h.service, state: "down" })}>{t("opsSimDown")}</DropdownMenuItem>
                        {h.state !== "ok" && <DropdownMenuItem onClick={() => m.restore.mutate(h.service)}>{t("opsBackToNormal")}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <ServiceStateBadge state={h.state} />
                  <dl className="grid grid-cols-2 gap-x-4 text-end text-sm">
                    <dt className="text-xs text-muted-foreground">{t("opsErrors")}</dt>
                    <dt className="text-xs text-muted-foreground">{t("opsP95")}</dt>
                    <dd className={cn("font-medium tabular-nums", h.errorRate >= THRESHOLDS.degradedErrorRate && "text-destructive")}>{num(h.errorRate, 1)} %</dd>
                    <dd className={cn("font-medium tabular-nums", h.p95Ms >= THRESHOLDS.degradedP95Ms && "text-destructive")}>{num(h.p95Ms)} ms</dd>
                  </dl>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t("opsSince", { duration: minutes(sinceMinutes(h.since)) })}</p>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("opsThresholds", { degraded: THRESHOLDS.degradedErrorRate, down: THRESHOLDS.downErrorRate, ms: num(THRESHOLDS.degradedP95Ms) })}</p>

      {open.length > 0 && (
        <Panel title={t("opsOpenTitle")} hint={t("opsOpenHint")}>
          <ul className="divide-y divide-border">
            {open.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 text-sm"><span className="text-muted-foreground tabular-nums">{i.number}</span> · {i.title}</span>
                <SeverityBadge severity={i.severity} />
                <IncidentStatusBadge status={i.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t("opsTenants")} hint={t("opsTenantsHint")}>
        <TableContainer>
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("pfCompany")}</TableHead>
                <TableHead className="text-end">{t("opsRequests")}</TableHead>
                <TableHead className="text-end">{t("opsErrorCount")}</TableHead>
                <TableHead className="text-end">{t("opsErrors")}</TableHead>
                <TableHead className="text-end">{t("opsP95")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((r) => {
                const rate = r.requests ? (r.errors / r.requests) * 100 : 0
                return (
                  <TableRow key={r.customerId}>
                    <TableCell><Link href={`/dashboard/platform/${r.customerId}`} className="font-medium hover:underline">{r.customerName}</Link><span className="block font-mono text-xs text-muted-foreground">{r.customerId}</span></TableCell>
                    <TableCell className="text-end tabular-nums">{num(r.requests)}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(r.errors)}</TableCell>
                    <TableCell className={cn("text-end tabular-nums", rate >= 0.5 && "font-medium text-warning-foreground")}>{num(rate, 2)} %</TableCell>
                    <TableCell className="text-end tabular-nums">{num(r.p95Ms)} ms</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>

      <Panel title={t("bkTitle")} hint={lastRestore ? t("bkLastRestore", { date: dateTime(lastRestore.at), result: t(lastRestore.result === "ok" ? "bkOk" : "bkFailed") }) : t("bkNoRestore")}>
        <TableContainer>
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("bkWhen")}</TableHead>
                <TableHead>{t("bkKind")}</TableHead>
                <TableHead>{t("bkResult")}</TableHead>
                <TableHead className="text-end">{t("bkSize")}</TableHead>
                <TableHead className="text-end">{t("bkDuration")}</TableHead>
                <TableHead>{t("bkNote")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{dateTime(r.at)}</TableCell>
                  <TableCell className={cn("text-sm", r.kind === "restore_test" && "font-medium")}>{t(r.kind === "backup" ? "bkBackup" : "bkRestoreTest")}</TableCell>
                  <TableCell><ResultBadge ok={r.result === "ok"} /></TableCell>
                  <TableCell className="text-end tabular-nums">{num(r.sizeGb, 1)} GB</TableCell>
                  <TableCell className="text-end tabular-nums">{minutes(r.minutes)}</TableCell>
                  <TableCell className="max-w-72 text-xs text-muted-foreground">{r.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
    </div>
  )
}
