"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Archive, DownloadIcon, Trash2 } from "@/components/ui/carbon/icons"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useCompanyDataRequests, useDataRequests } from "@/hooks/platform/use-platform-data"
import { cn } from "@/lib/utils"
import type { CustomerAccount } from "@/types/platform-customers"

/**
 * AUD-04, AUD-05 from the company's side: its administrator asks Nexora for a
 * copy of all the company's data (ready within 7 days) or for the account to
 * be deleted, and follows each request here.
 */
export function CompanyDataSection({ customer }: { customer: CustomerAccount }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: all = [] } = useDataRequests()
  const m = useCompanyDataRequests()
  const [deleting, setDeleting] = useState(false)
  const [reason, setReason] = useState("")
  const mine = all.filter((r) => r.customerId === customer.id)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const exportOpen = mine.some((r) => r.kind === "export" && r.status === "received")
  const deletionOpen = mine.some((r) => r.kind === "deletion" && (r.status === "received" || r.status === "prepared"))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <h2 className="text-base font-semibold">{t("cdTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("cdHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={exportOpen || m.askExport.isPending} onClick={() => m.askExport.mutate(customer.id)}><Archive className="size-4" />{t("cdAskExport")}</Button>
        <Button variant="outline" className="text-destructive" disabled={deletionOpen} onClick={() => { setReason(""); setDeleting(true) }}><Trash2 className="size-4" />{t("cdAskDeletion")}</Button>
      </div>
      {mine.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border">
          {mine.map((r) => {
            const ready = r.kind === "export" && r.status === "fulfilled" && (!r.availableUntil || r.availableUntil >= today)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="w-28 font-mono text-xs">{r.number}</span>
                <span className="flex-1">
                  {t(r.kind === "export" ? "drKind_export" : "drKind_deletion")} · {date(r.receivedAt)}
                  <span className="block text-xs text-muted-foreground">
                    {r.status === "received" || r.status === "prepared" ? t("cdDue", { date: date(r.dueOn) }) : r.status === "fulfilled" && r.availableUntil ? t("cdAvailableUntil", { date: date(r.availableUntil) }) : r.status === "refused" ? r.refusedReason : r.status === "deleted" ? t("cdDeleted") : ""}
                  </span>
                </span>
                <Badge variant="outline" className={cn("border-transparent", ready ? "bg-success-soft text-success-foreground" : r.status === "refused" || r.status === "fulfilled" ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning-foreground")}>{r.status === "fulfilled" && !ready ? t("drStatus_expired") : t(`drStatus_${r.status}`)}</Badge>
                {ready && <Button size="sm" onClick={() => m.download.mutate(r.id)}><DownloadIcon className="size-4" />{t("cdDownload")}</Button>}
              </li>
            )
          })}
        </ul>
      )}
      <DataTableEntityFormSheet
        open={deleting}
        onOpenChange={setDeleting}
        mode="create"
        createTitle={t("cdDeletionTitle")}
        editTitle=""
        description={t("cdDeletionDesc")}
        isSubmitting={m.askDeletion.isPending}
        submitLabel={{ create: t("cdDeletionSend") }}
        onSubmit={() => m.askDeletion.mutate({ customerId: customer.id, reason }, { onSuccess: () => setDeleting(false) })}
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="cd-reason">{t("cdDeletionReason")}</Label>
            <Textarea id="cd-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
            <li>{t("cdDeletionRule1")}</li>
            <li>{t("cdDeletionRule2")}</li>
            <li>{t("cdDeletionRule3")}</li>
          </ul>
        </div>
      </DataTableEntityFormSheet>
    </section>
  )
}
