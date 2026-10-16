"use client"

import { ZonedTime } from "@/components/shared/zoned-time"
import type { ConsoleAuditEvent } from "@/types/platform-console"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { DownloadIcon, Lock } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { FilterPill } from "@/components/shared/overview-chunks/filter-pill"
import { useConsoleActor, useConsoleCustomers, useConsoleAudit, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { consoleCan } from "@/lib/platform/console-roles"
import { exportToCsv } from "@/lib/utils/export-data"
import { ConsoleCapability, type ConsoleRole } from "@/types/platform-console"
import { ACTION_LABEL, ROLE_LABEL, RoleBadge, StepUpDialog } from "./console-shared"
import { NameCell, inSelection, searchIn, sortHeader } from "./console-table"

const ALL = "all"
const PERIODS = { "7": 7, "30": 30, "90": 90 } as const

/** Every console action that changed money, access, status or configuration (AUD-01 to AUD-03, AUD-07). */

export default function ConsoleAuditPage() {
  const t = useTranslations()
  const actor = useConsoleActor()
  const { data: events = [], isLoading } = useConsoleAudit()
  const m = useConsoleMutations()
  const [period, setPeriod] = useState<string>("30")
  // the rows shown when the export was asked for: the export equals the filtered list (AUD-03)
  const [exporting, setExporting] = useState<ConsoleAuditEvent[] | null>(null)
  // the period is counted from when the page opened
  const [openedAt] = useState(() => Date.now())
  const canExport = consoleCan(actor?.role, ConsoleCapability.EXPORT_AUDIT)

  // a role key or a stored value ("removed", "active") reads as words
  const STATE_LABEL: Record<string, string> = { active: "sesActive", revoked: "sesRevokedState", removed: "auaRemoved" }
  const value = (v?: string) => (!v ? "" : v in ROLE_LABEL ? t(ROLE_LABEL[v as ConsoleRole]) : STATE_LABEL[v] ? t(STATE_LABEL[v]) : v)
  const { data: zoneCustomers = [] } = useConsoleCustomers()
  const countryOf = (id?: string) => (id ? zoneCustomers.find((c) => c.id === id)?.country : undefined)
  const actors = useMemo(() => [...new Map(events.map((e) => [e.actorId, e.actorName])).entries()], [events])
  const rows = useMemo(() => {
    const since = period === ALL ? 0 : openedAt - PERIODS[period as keyof typeof PERIODS] * 86_400_000
    return events.filter((e) => new Date(e.at).getTime() >= since)
  }, [events, period, openedAt])

  const columns = useMemo<ColumnDef<ConsoleAuditEvent>[]>(() => [
    {
      id: "at",
      accessorFn: (e) => e.at,
      header: sortHeader(t("audWhen")),
      filterFn: searchIn<ConsoleAuditEvent>((e) => [e.actorName, e.targetLabel, e.before, e.after]),
      cell: ({ row: { original: e } }) => <span className="whitespace-nowrap text-sm text-muted-foreground"><ZonedTime iso={e.at} country={countryOf(e.customerId)} /></span>,
    },
    { id: "who", accessorFn: (e) => e.actorId, sortingFn: (a, b) => a.original.actorName.localeCompare(b.original.actorName), header: sortHeader(t("audWho")), filterFn: inSelection, cell: ({ row: { original: e } }) => <NameCell name={e.actorName} sub={<RoleBadge role={e.actorRole} />} /> },
    { id: "action", accessorFn: (e) => e.action, header: sortHeader(t("audAction")), filterFn: inSelection, cell: ({ row: { original: e } }) => t(ACTION_LABEL[e.action]) },
    { id: "target", accessorFn: (e) => e.targetLabel, header: sortHeader(t("audTarget")) },
    {
      id: "change",
      enableSorting: false,
      header: t("audChange"),
      cell: ({ row: { original: e } }) => <span className="text-sm">{e.before || e.after ? <span>{e.before && <span className="text-muted-foreground line-through">{value(e.before)}</span>}{e.before && e.after && " → "}{value(e.after)}</span> : "—"}</span>,
    },
    { id: "from", enableSorting: false, header: t("audFrom"), cell: ({ row: { original: e } }) => <span className="text-xs text-muted-foreground tabular-nums">{e.ip}<span className="block">{e.sessionId}</span></span> },
  // the formatters only change with the language and the customers' zones
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, zoneCustomers])

  const doExport = (rows: ConsoleAuditEvent[]) => {
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
      <PageHeader>
        <FilterPill
          label={period === ALL ? t("audAllTime") : t("audLastDays", { days: period })}
          value={period}
          width="w-44"
          onChange={setPeriod}
          options={[...Object.keys(PERIODS).map((p) => ({ value: p, label: t("audLastDays", { days: p }) })), { value: ALL, label: t("audAllTime") }]}
        />
      </PageHeader>
      <DataTable
        title={t("consoleAudit")}
        isLoading={isLoading}
        columns={columns}
        data={rows}
        searchColumnId="at"
        searchPlaceholder={t("audSearch")}
        emptyMessage={t("audEmpty")}
        defaultSorting={[{ id: "at", desc: true }]}
        defaultPageSize={25}
        showRange savedViewsKey="console-audit"
        // AUD-03, AUD-07: platform owners only, with the authenticator code; the export is itself audited
        enableExport={canExport}
        exportOptions={[{ label: t("audExport"), icon: DownloadIcon, onClick: (list) => list.length && setExporting(list as ConsoleAuditEvent[]) }]}
        filters={[
          { columnId: "who", title: t("audWho"), options: actors.map(([id, name]) => ({ value: id, label: name })) },
          { columnId: "action", title: t("audAction"), options: [...new Set(events.map((e) => e.action))].map((a) => ({ value: a, label: t(ACTION_LABEL[a]) })) },
        ]}
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" aria-hidden />{t("audAppendOnly")}</p>
      <StepUpDialog open={!!exporting} onOpenChange={(v) => !v && setExporting(null)} action={t("audExportConfirm", { count: exporting?.length ?? 0 })} onConfirmed={() => exporting && doExport(exporting)} />
    </div>
  )
}
