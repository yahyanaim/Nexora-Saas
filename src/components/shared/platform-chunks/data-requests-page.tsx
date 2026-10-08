"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Archive, CheckCircle, DownloadIcon, FolderLock, Trash2, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useDataRequestMutations, useDataRequests, useRetention } from "@/hooks/platform/use-platform-data"
import { isLate } from "@/lib/api/platform-data-api"
import { consoleCan } from "@/lib/platform/console-roles"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { DataRequest } from "@/types/platform-data"
import { StepUpDialog } from "./console-shared"
import { Panel, useBillingFormat } from "./billing-shared"

const STATUS_CLASS: Record<DataRequest["status"], string> = {
  received: "bg-warning-soft text-warning-foreground",
  prepared: "bg-info-soft text-info-foreground",
  fulfilled: "bg-success-soft text-success-foreground",
  deleted: "bg-muted text-foreground",
  refused: "bg-muted text-muted-foreground",
}

/**
 * Customer data requests (AUD-04, AUD-05) and how long Nexora keeps data
 * (AUD-06). Exports are delivered within 7 days; a deletion is prepared by one
 * team member and approved by a platform owner with the authenticator code.
 */
export default function ConsoleDataRequestsPage() {
  const t = useTranslations()
  const { date, dateTime } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: requests = [], isLoading } = useDataRequests()
  const { data: retention } = useRetention()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useDataRequestMutations()
  const [openId, setOpenId] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [refusing, setRefusing] = useState("")
  const [years, setYears] = useState<string | null>(null)
  const [savingYears, setSavingYears] = useState(false)
  const open = requests.find((r) => r.id === openId)
  const canHandle = consoleCan(actor?.role, C.CHANGE_STATUS)
  const canPrepare = consoleCan(actor?.role, C.CHANGE_SUBSCRIPTION)
  const canApprove = consoleCan(actor?.role, C.DELETE_CUSTOMER)
  const isOwner = actor?.role === ConsoleRole.OWNER
  const openOnes = requests.filter((r) => r.status === "received" || r.status === "prepared")
  const late = openOnes.filter((r) => isLate(r))
  const statusOf = (id: string) => customers.find((c) => c.id === id)?.status
  const today = new Date().toISOString().slice(0, 10)
  // a delivered export past its 7 days can no longer be downloaded
  const expired = (r: DataRequest) => r.status === "fulfilled" && !!r.availableUntil && r.availableUntil < today
  const statusLabel = (r: DataRequest) => (expired(r) ? t("drStatus_expired") : t(`drStatus_${r.status}`))

  const cards: MetricCardItem[] = [
    { key: "open", title: t("drOpen"), value: openOnes.length, footer: { icon: FolderLock, text: t("drOpenHint") } },
    { key: "late", title: t("drLate"), value: late.length, valueClassName: late.length ? "text-destructive" : undefined, footer: { icon: Warning, text: t("drLateHint") } },
    { key: "exports", title: t("drExportsDone"), value: requests.filter((r) => r.kind === "export" && r.status === "fulfilled").length, footer: { icon: DownloadIcon, text: t("drExportsHint") } },
    { key: "deleted", title: t("drDeletedCount"), value: requests.filter((r) => r.kind === "deletion" && r.status === "deleted").length, footer: { icon: Trash2, text: t("drDeletedHint") } },
  ]

  const nextStep = (r: DataRequest) => {
    if (r.kind === "export" && r.status === "received") return canHandle ? <Button size="sm" onClick={() => m.fulfil.mutate(r.id)} disabled={m.fulfil.isPending}><Archive className="size-4" />{t("drPrepareExport")}</Button> : null
    if (r.kind === "export" && r.status === "fulfilled" && !expired(r)) return canHandle ? <Button size="sm" variant="outline" onClick={() => m.download.mutate(r.id)}><DownloadIcon className="size-4" />{t("drCheckFile")}</Button> : null
    if (r.kind === "deletion" && r.status === "received") {
      if (!canPrepare) return null
      return statusOf(r.customerId) === "cancelled"
        ? <Button size="sm" onClick={() => m.prepare.mutate(r.id)}>{t("drPrepareDeletion")}</Button>
        : <span className="text-xs text-warning-foreground">{t("drCancelFirst")}</span>
    }
    if (r.kind === "deletion" && r.status === "prepared") {
      if (r.preparedBy === actor?.name) return <span className="text-xs text-muted-foreground">{t("drNeedsOther")}</span>
      return canApprove ? <Button size="sm" variant="danger" onClick={() => setApproving(r.id)}><Trash2 className="size-4" />{t("drApproveDeletion")}</Button> : null
    }
    return null
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} />

      <Panel title={t("drList")} hint={t("drListHint")}>
        {isLoading ? <ListSkeleton /> : (
          <TableContainer>
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("drNumber")}</TableHead>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("drKind")}</TableHead>
                  <TableHead>{t("drReceived")}</TableHead>
                  <TableHead>{t("drDue")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <TableCell className="font-mono text-xs">
                      <button type="button" className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(e) => { e.stopPropagation(); setOpenId(r.id) }}>{r.number}</button>
                    </TableCell>
                    <TableCell><p className="font-medium">{r.customerName}</p><p className="text-xs text-muted-foreground">{r.requestedBy.name}</p></TableCell>
                    <TableCell>{t(r.kind === "export" ? "drKind_export" : "drKind_deletion")}</TableCell>
                    <TableCell className="text-sm">{date(r.receivedAt)}</TableCell>
                    <TableCell className={cn("text-sm", isLate(r) && "font-medium text-destructive")}>{date(r.dueOn)}{isLate(r) && ` · ${t("drLateBadge")}`}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-transparent", expired(r) ? "bg-muted text-muted-foreground" : STATUS_CLASS[r.status])}>{statusLabel(r)}</Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{nextStep(r)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("drRules")}</p>
      </Panel>

      {retention && (
        <Panel title={t("drRetention")} hint={t("drRetentionHint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("drAuditKept")}</p>
              <p className="mt-1 text-lg font-semibold">{t("drYears", { n: retention.auditYears })}</p>
              <p className="text-xs text-muted-foreground">{t("drAuditKeptHint")}</p>
              {isOwner && (
                years === null
                  ? <Button size="sm" variant="outline" className="mt-2" onClick={() => setYears(String(retention.auditYears))}>{t("edit")}</Button>
                  : (
                    <div className="mt-2 flex items-end gap-2">
                      <div className="space-y-1"><Label htmlFor="dr-years" className="text-xs">{t("drYearsLabel")}</Label><Input id="dr-years" type="number" min={5} max={30} value={years} onChange={(e) => setYears(e.target.value)} className="w-24" /></div>
                      <Button size="sm" onClick={() => setSavingYears(true)}>{t("save")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setYears(null)}>{t("cancel")}</Button>
                    </div>
                  )
              )}
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("drInvoicesKept")}</p>
              <p className="mt-1 text-lg font-semibold">{t("drYears", { n: retention.invoiceYears })}</p>
              <p className="text-xs text-muted-foreground">{t("drInvoicesKeptHint")}</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("drExportKept")}</p>
              <p className="mt-1 text-lg font-semibold">{t("drDays", { n: retention.exportDays })}</p>
              <p className="text-xs text-muted-foreground">{t("drExportKeptHint")}</p>
            </div>
          </div>
        </Panel>
      )}

      <DataTableEntityFormSheet
        open={!!open}
        onOpenChange={(v) => { if (!v) { setOpenId(null); setRefusing("") } }}
        mode="edit"
        createTitle=""
        editTitle={open ? `${open.number} · ${open.customerName}` : ""}
        description={open ? t(open.kind === "export" ? "drSheetExport" : "drSheetDeletion") : ""}
        isSubmitting={m.refuse.isPending}
        submitLabel={{ edit: t("drRefuse") }}
        hideSubmit={!open || !canHandle || (open.status !== "received" && open.status !== "prepared")}
        onSubmit={() => open && m.refuse.mutate({ id: open.id, reason: refusing }, { onSuccess: () => { setOpenId(null); setRefusing("") } })}
      >
        {open && (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">{t("drAskedBy")}</dt><dd>{open.requestedBy.name}<br /><span className="text-xs text-muted-foreground">{open.requestedBy.email}</span></dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("status")}</dt><dd><Badge variant="outline" className={cn("border-transparent", expired(open) ? "bg-muted text-muted-foreground" : STATUS_CLASS[open.status])}>{statusLabel(open)}</Badge></dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("drReceived")}</dt><dd>{dateTime(open.receivedAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{t("drDue")}</dt><dd className={cn(isLate(open) && "text-destructive")}>{date(open.dueOn)}</dd></div>
              {open.reason && <div className="col-span-2"><dt className="text-xs text-muted-foreground">{t("drReason")}</dt><dd>{open.reason}</dd></div>}
              {open.records !== undefined && <div><dt className="text-xs text-muted-foreground">{t("drRecords")}</dt><dd>{open.records.toLocaleString()}</dd></div>}
              {open.availableUntil && <div><dt className="text-xs text-muted-foreground">{t("drAvailableUntil")}</dt><dd>{date(open.availableUntil)} · {t("drDownloads", { n: open.downloads ?? 0 })}</dd></div>}
              {open.preparedBy && <div><dt className="text-xs text-muted-foreground">{t("drPreparedBy")}</dt><dd>{open.preparedBy}</dd></div>}
              {open.status === "deleted" && <div className="col-span-2 rounded-2xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{t("drAfterDeletion")}</dt><dd>{t("drAfterDeletionText", { records: open.deletedRecords ?? 0, invoices: open.keptInvoices ?? 0, date: date(open.retainedUntil ?? "") })}</dd></div>}
              {open.refusedReason && <div className="col-span-2"><dt className="text-xs text-muted-foreground">{t("drRefusedBecause")}</dt><dd>{open.refusedReason}</dd></div>}
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("drHistory")}</h3>
              <ol className="space-y-2 border-s border-border ps-4">
                {open.history.map((h, i) => (
                  <li key={i}><p>{h.text}</p><p className="text-xs text-muted-foreground">{h.by} · {dateTime(h.at)}</p></li>
                ))}
              </ol>
            </div>
            {open.kind === "deletion" && open.status !== "deleted" && <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("drDeletionWhat")}</p>}
            {canHandle && (open.status === "received" || open.status === "prepared") && (
              <div className="space-y-1.5">
                <Label htmlFor="dr-refuse">{t("drRefuseReason")}</Label>
                <Textarea id="dr-refuse" rows={2} value={refusing} onChange={(e) => setRefusing(e.target.value)} placeholder={t("drRefusePh")} />
              </div>
            )}
            {open.status === "fulfilled" && !expired(open) && <p className="flex items-center gap-2 text-xs text-success-foreground"><CheckCircle className="size-4" />{t("drFulfilledNote")}</p>}
          </div>
        )}
      </DataTableEntityFormSheet>

      <StepUpDialog open={!!approving} onOpenChange={(v) => !v && setApproving(null)} action={t("drApproveStepUp")} onConfirmed={() => approving && m.approve.mutate(approving)} />
      <StepUpDialog open={savingYears} onOpenChange={setSavingYears} action={t("drRetentionStepUp", { n: Number(years ?? 0) })} onConfirmed={() => m.retention.mutate(Number(years), { onSuccess: () => setYears(null) })} />
    </div>
  )
}
