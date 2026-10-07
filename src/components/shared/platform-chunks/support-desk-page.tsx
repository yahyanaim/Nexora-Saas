"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Clock, DoorOpen, Headset, Search, UserX } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { useSupportDeskMutations, useSupportRequests } from "@/hooks/platform/use-platform-support"
import { canHandleSupport } from "@/lib/api/platform-support-api"
import { consoleCan } from "@/lib/platform/console-roles"
import { responseBreached } from "@/lib/platform/support-rules"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { SupportStatus } from "@/types/platform-support"
import { Panel } from "./billing-shared"
import { SessionRequestSheet, type SessionDraft } from "./session-request-sheet"
import { Conversation, PriorityBadge, ResponseTarget, SupportStatusBadge, useSupportFormat } from "./support-shared"

const STATUSES: SupportStatus[] = ["open", "waiting_customer", "resolved", "closed"]
type Filter = "active" | "all" | SupportStatus

/** Requests raised by customer companies, answered by the Nexora team (SUP-01, SUP-02, SUP-10). */
export default function ConsoleSupportDeskPage() {
  const t = useTranslations()
  const { dateTime } = useSupportFormat()
  const actor = useConsoleActor()
  const { data: requests = [], isLoading } = useSupportRequests()
  const { data: staff = [] } = useConsoleStaff()
  const m = useSupportDeskMutations()
  const [now] = useState(() => new Date())
  const [filter, setFilter] = useState<Filter>("active")
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
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

  const q = query.trim().toLowerCase()
  const rows = requests
    .filter((r) => (filter === "all" ? true : filter === "active" ? r.status === "open" || r.status === "waiting_customer" : r.status === filter))
    .filter((r) => !q || `${r.number} ${r.customerName} ${r.subject} ${r.requesterName}`.toLowerCase().includes(q))
  const filterLabel = (f: Filter) => (f === "active" ? t("sdActive") : f === "all" ? t("sdAll") : t(`supSt_${f}`))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      <Panel
        title={t("sdList")}
        hint={t("sdListHint")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("sdSearch")} aria-label={t("sdSearch")} className="w-64 ps-9" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-48" aria-label={t("status")}><SelectValue>{filterLabel(filter)}</SelectValue></SelectTrigger>
              <SelectContent>{(["active", "all", ...STATUSES] as Filter[]).map((f) => <SelectItem key={f} value={f}>{filterLabel(f)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? <ListSkeleton /> : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("sdEmpty")}</p>
        ) : (
          <TableContainer>
            <Table className="min-w-[60rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sdRequest")}</TableHead>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("sdPriority")}</TableHead>
                  <TableHead>{t("sdAssignee")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("sdUpdated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-80">
                      <button type="button" onClick={() => setOpenId(r.id)} className="text-start font-medium hover:underline focus-visible:underline">
                        <span className="text-muted-foreground tabular-nums">{r.number}</span> · {r.subject}
                      </button>
                      <span className="block text-xs text-muted-foreground">{t(`supCat_${r.category}`)} · {r.requesterName}</span>
                    </TableCell>
                    <TableCell><Link href={`/dashboard/platform/${r.customerId}`} className="hover:underline">{r.customerName}</Link></TableCell>
                    <TableCell><PriorityBadge priority={r.priority} /><span className="mt-1 block"><ResponseTarget request={r} now={now} /></span></TableCell>
                    <TableCell className="text-sm">{r.assigneeName ?? <span className="text-muted-foreground">{t("sdNobody")}</span>}</TableCell>
                    <TableCell><SupportStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dateTime(r.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("sdTargets")}</p>
      </Panel>

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
