"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DownloadIcon, History, Lock } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useConsoleActor, useConsoleAudit, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { consoleCan } from "@/lib/platform/console-roles"
import { exportToCsv } from "@/lib/utils/export-data"
import { ConsoleCapability, type ConsoleAuditAction, type ConsoleRole } from "@/types/platform-console"
import { ACTION_LABEL, ROLE_LABEL, RoleBadge, StepUpDialog } from "./console-shared"

const ALL = "all"
const PERIODS = { "7": 7, "30": 30, "90": 90 } as const

/** Every console action that changed money, access, status or configuration (AUD-01 to AUD-03, AUD-07). */
export default function ConsoleAuditPage() {
  const t = useTranslations()
  const locale = useLocale()
  const actor = useConsoleActor()
  const { data: events = [], isLoading } = useConsoleAudit()
  const m = useConsoleMutations()
  const [query, setQuery] = useState("")
  const [who, setWho] = useState(ALL)
  const [action, setAction] = useState(ALL)
  const [period, setPeriod] = useState<string>("30")
  const [stepUp, setStepUp] = useState(false)
  // the period is counted from when the page opened
  const [openedAt] = useState(() => Date.now())
  const canExport = consoleCan(actor?.role, ConsoleCapability.EXPORT_AUDIT)

  // a role key or a stored value ("removed", "active") reads as words
  const STATE_LABEL: Record<string, string> = { active: "sesActive", revoked: "sesRevokedState", removed: "auaRemoved" }
  const value = (v?: string) => (!v ? "" : v in ROLE_LABEL ? t(ROLE_LABEL[v as ConsoleRole]) : STATE_LABEL[v] ? t(STATE_LABEL[v]) : v)
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  const actors = useMemo(() => [...new Map(events.map((e) => [e.actorId, e.actorName])).entries()], [events])
  const rows = useMemo(() => {
    const since = period === ALL ? 0 : openedAt - PERIODS[period as keyof typeof PERIODS] * 86_400_000
    const q = query.trim().toLowerCase()
    return events.filter(
      (e) =>
        (who === ALL || e.actorId === who) &&
        (action === ALL || e.action === action) &&
        new Date(e.at).getTime() >= since &&
        (!q || `${e.actorName} ${e.targetLabel} ${e.before ?? ""} ${e.after ?? ""}`.toLowerCase().includes(q))
    )
  }, [events, who, action, period, query, openedAt])

  const doExport = () => {
    const ok = exportToCsv(
      rows.map((e) => ({ at: e.at, actor: e.actorName, role: e.actorRole === "customer" ? t("crCustomer") : t(ROLE_LABEL[e.actorRole]), action: t(ACTION_LABEL[e.action]), target: e.targetLabel, before: value(e.before), after: value(e.after), ip: e.ip, session: e.sessionId })),
      `nexora-console-audit-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "at", label: t("audWhen") }, { key: "actor", label: t("audWho") }, { key: "role", label: t("stfRole") }, { key: "action", label: t("audAction") },
        { key: "target", label: t("audTarget") }, { key: "before", label: t("audBefore") }, { key: "after", label: t("audAfter") }, { key: "ip", label: "IP" }, { key: "session", label: t("audSession") },
      ]
    )
    if (ok) m.recordExport.mutate(rows.length)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canExport ? (
            <Button variant="outline" onClick={() => setStepUp(true)} disabled={rows.length === 0}><DownloadIcon className="size-4" />{t("audExport")}</Button>
          ) : undefined
        }
      />
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Input className="w-full sm:w-64" placeholder={t("audSearch")} aria-label={t("audSearch")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={who} onValueChange={setWho}>
            <SelectTrigger className="w-48" aria-label={t("audWho")}><SelectValue>{who === ALL ? t("audAllPeople") : actors.find(([id]) => id === who)?.[1]}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("audAllPeople")}</SelectItem>
              {actors.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-56" aria-label={t("audAction")}><SelectValue>{action === ALL ? t("audAllActions") : t(ACTION_LABEL[action as ConsoleAuditAction])}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("audAllActions")}</SelectItem>
              {(Object.keys(ACTION_LABEL) as ConsoleAuditAction[]).map((a) => <SelectItem key={a} value={a}>{t(ACTION_LABEL[a])}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" aria-label={t("audPeriod")}><SelectValue>{period === ALL ? t("audAllTime") : t("audLastDays", { days: period })}</SelectValue></SelectTrigger>
            <SelectContent>
              {Object.keys(PERIODS).map((p) => <SelectItem key={p} value={p}>{t("audLastDays", { days: p })}</SelectItem>)}
              <SelectItem value={ALL}>{t("audAllTime")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title={t("audEmpty")} hint={t("audEmptyHint")} />
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audWhen")}</TableHead>
                  <TableHead>{t("audWho")}</TableHead>
                  <TableHead>{t("audAction")}</TableHead>
                  <TableHead>{t("audTarget")}</TableHead>
                  <TableHead>{t("audChange")}</TableHead>
                  <TableHead>{t("audFrom")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{when(e.at)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{e.actorName}</p>
                      <RoleBadge role={e.actorRole} />
                    </TableCell>
                    <TableCell>{t(ACTION_LABEL[e.action])}</TableCell>
                    <TableCell>{e.targetLabel}</TableCell>
                    <TableCell className="text-sm">
                      {e.before || e.after ? (
                        <span>{e.before && <span className="text-muted-foreground line-through">{value(e.before)}</span>}{e.before && e.after && " → "}{value(e.after)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{e.ip}<span className="block">{e.sessionId}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" aria-hidden />{t("audAppendOnly")}</p>
      </section>
      <StepUpDialog open={stepUp} onOpenChange={setStepUp} action={t("audExportConfirm", { count: rows.length })} onConfirmed={doExport} />
    </div>
  )
}
