"use client"

import { ZonedTime } from "@/components/shared/zoned-time"
import type { SupportRequest } from "@/types/platform-support"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertTriangle, Clock, DoorOpen, Eye, Headset, UserX } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { DataTableRowActions } from "@/components/shared/data-table-chunks/data-table-row-actions"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { useSupportDeskMutations, useSupportRequests } from "@/hooks/platform/use-platform-support"
import { canHandleSupport } from "@/lib/api/platform-support-api"
import { consoleCan } from "@/lib/platform/console-roles"
import { responseBreached } from "@/lib/platform/support-rules"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { SupportStatus } from "@/types/platform-support"
import { inSelection, searchIn, sortHeader } from "./console-table"
import { SessionRequestSheet, type SessionDraft } from "./session-request-sheet"
import { Conversation, PriorityBadge, ResponseTarget, SupportStatusBadge } from "./support-shared"

const STATUSES: SupportStatus[] = ["open", "waiting_customer", "resolved", "closed"]

/** Requests raised by customer companies, answered by the Nexora team (SUP-01, SUP-02, SUP-10). */
const PRIORITY_RANK = { urgent: 4, high: 3, normal: 2, low: 1 } as const
const PRIORITIES = ["urgent", "high", "normal", "low"] as const

export default function ConsoleSupportDeskPage() {
  const t = useTranslations()

  const actor = useConsoleActor()
  const { data: requests = [], isLoading } = useSupportRequests()
  const { data: zoneCustomers = [] } = useConsoleCustomers()
  const countryOf = (id?: string) => (id ? zoneCustomers.find((c) => c.id === id)?.country : undefined)
  const { data: staff = [] } = useConsoleStaff()
  const m = useSupportDeskMutations()
  const [now] = useState(() => new Date())
  // ?request=<id> (from the console home or the bell) opens that request once
  const linked = useSearchParams().get("request")
  const [openId, setOpenId] = useState<string | null>(linked)
  const [wait, setWait] = useState(true)
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const canAnswer = canHandleSupport(actor?.role)
  const canAsk = consoleCan(actor?.role, C.SUPPORT_SESSION)
  const agents = staff.filter((s) => s.status === "active" && canHandleSupport(s.role))
  const open = requests.find((r) => r.id === openId) ?? null

  const live = requests.filter((r) => r.status === "open" || r.status === "waiting_customer")
  const cards: MetricCardItem[] = [
    { key: "open", title: t("sdOpen"), value: requests.filter((r) => r.status === "open").length, footer: { icon: Headset, text: t("sdOpenHint") } },
    { key: "unassigned", title: t("sdUnassigned"), value: live.filter((r) => !r.assigneeId).length, footer: { icon: UserX, text: t("sdUnassignedHint") } },
    { key: "late", title: t("sdLate"), value: live.filter((r) => responseBreached(r, now)).length, footer: { icon: AlertTriangle, text: t("sdLateHint") } },
    { key: "waiting", title: t("sdWaiting"), value: requests.filter((r) => r.status === "waiting_customer").length, footer: { icon: Clock, text: t("sdWaitingHint") } },
  ]

  const columns = useMemo<ColumnDef<SupportRequest>[]>(() => [
    {
      id: "number",
      accessorFn: (r) => r.number,
      header: sortHeader(t("sdRequest")),
      filterFn: searchIn<SupportRequest>((r) => [r.number, r.customerName, r.subject, r.requesterName]),
      cell: ({ row: { original: r } }) => (
        <span className="block max-w-80">
          <button type="button" onClick={() => setOpenId(r.id)} className="text-start font-medium hover:underline focus-visible:underline">
            <span className="text-muted-foreground tabular-nums">{r.number}</span> · {r.subject}
          </button>
          <span className="block text-xs text-muted-foreground">{t(`supCat_${r.category}`)} · {r.requesterName}</span>
        </span>
      ),
    },
    { id: "company", accessorFn: (r) => r.customerName, header: sortHeader(t("pfCompany")), cell: ({ row: { original: r } }) => <Link href={`/dashboard/platform/${r.customerId}`} className="hover:underline">{r.customerName}</Link> },
    {
      id: "priority",
      accessorFn: (r) => r.priority,
      sortingFn: (a, b) => PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
      header: sortHeader(t("sdPriority")),
      filterFn: inSelection,
      cell: ({ row: { original: r } }) => <span><PriorityBadge priority={r.priority} /><span className="mt-1 block"><ResponseTarget request={r} now={now} /></span></span>,
    },
    { id: "assignee", accessorFn: (r) => r.assigneeName ?? "", header: sortHeader(t("sdAssignee")), cell: ({ row: { original: r } }) => <span className="text-sm">{r.assigneeName ?? <span className="text-muted-foreground">{t("sdNobody")}</span>}</span> },
    { id: "status", accessorFn: (r) => r.status, header: sortHeader(t("status")), filterFn: inSelection, cell: ({ row: { original: r } }) => <SupportStatusBadge status={r.status} /> },
    { id: "updated", accessorFn: (r) => r.updatedAt, header: sortHeader(t("sdUpdated")), cell: ({ row: { original: r } }) => <span className="text-sm text-muted-foreground"><ZonedTime iso={r.updatedAt} country={countryOf(r.customerId)} /></span> },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row: { original: r } }) => (
        <DataTableRowActions row={r} actions={[
          { label: t("sdOpenRequest"), icon: Eye, onClick: (x) => setOpenId(x.id) },
          ...(canAsk && r.status !== "closed" ? [{ label: t("sdAskAccess"), icon: DoorOpen, onClick: (x: SupportRequest) => setDraft({ customerId: x.customerId, requestId: x.id, requestNumber: x.number, reason: `${x.subject} (${x.number})` }) }] : []),
        ]} />
      ),
    },
  // the formatters only change with the language, the role and the customers' zones
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, canAsk, zoneCustomers])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      {/* the active requests (open or waiting for the customer) first; the filter shows the others */}
      <DataTable
        title={t("sdList")}
        isLoading={isLoading}
        columns={columns}
        data={requests}
        searchColumnId="number"
        searchPlaceholder={t("sdSearch")}
        emptyMessage={t("sdEmpty")}
        defaultSorting={[{ id: "updated", desc: true }]}
        defaultColumnFilters={[{ id: "status", value: ["open", "waiting_customer"] }]}
        showRange
        exportFilename="nexora-support-requests"
        getExportData={() => requests.map((r) => ({ number: r.number, company: r.customerName, subject: r.subject, category: r.category, priority: r.priority, assignee: r.assigneeName ?? "", status: r.status, updated: r.updatedAt }))}
        filters={[
          { columnId: "status", title: t("status"), options: STATUSES.map((st) => ({ value: st, label: t(`supSt_${st}`) })) },
          { columnId: "priority", title: t("sdPriority"), options: PRIORITIES.map((p) => ({ value: p, label: t(`supPr_${p}`) })) },
        ]}
      />
      <p className="text-xs text-muted-foreground">{t("sdListHint")} {t("sdTargets")}</p>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-xl">{open.number} · {open.subject}</SheetTitle>
                <SheetDescription>{t("sdFrom", { name: open.requesterName, email: open.requesterEmail, company: open.customerName })}</SheetDescription>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <PriorityBadge priority={open.priority} />
                  <SupportStatusBadge status={open.status} />
                  <ResponseTarget request={open} now={now} />
                </div>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                {canAnswer ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sd-assignee">{t("sdAssignee")}</Label>
                      <Select value={open.assigneeId ?? ""} onValueChange={(id) => { const s = agents.find((a) => a.id === id); if (s) m.assign.mutate({ id: open.id, staff: { id: s.id, name: s.name } }) }}>
                        <SelectTrigger id="sd-assignee"><SelectValue placeholder={t("sdNobody")}>{open.assigneeName}</SelectValue></SelectTrigger>
                        <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sd-status">{t("status")}</Label>
                      <Select value={open.status} onValueChange={(v) => m.setStatus.mutate({ id: open.id, status: v as SupportStatus })}>
                        <SelectTrigger id="sd-status"><SelectValue>{t(`supSt_${open.status}`)}</SelectValue></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`supSt_${s}`)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{t("sdReadOnly")}</p>
                )}
                {canAsk && open.status !== "closed" && (
                  <Button variant="outline" size="sm" onClick={() => setDraft({ customerId: open.customerId, requestId: open.id, requestNumber: open.number, reason: `${open.subject} (${open.number})` })}>
                    <DoorOpen className="size-4" />{t("sdAskAccess")}
                  </Button>
                )}
                <Conversation
                  request={open}
                  me="nexora"
                  sending={m.reply.isPending}
                  onReply={canAnswer ? (text, done) => m.reply.mutate({ id: open.id, text, waitForCustomer: wait }, { onSuccess: done }) : undefined}
                  extra={
                    <div className="flex items-center gap-2">
                      <Checkbox id="sd-wait" checked={wait} onCheckedChange={(v) => setWait(v === true)} />
                      <Label htmlFor="sd-wait" className="font-normal">{t("sdWaitCustomer")}</Label>
                    </div>
                  }
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SessionRequestSheet key={draft ? `${draft.customerId}-${draft.requestId}` : "none"} draft={draft} onClose={() => setDraft(null)} />
    </div>
  )
}
