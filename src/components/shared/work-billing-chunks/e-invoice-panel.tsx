"use client"

import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileCode, RefreshCw, Upload } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { eInvoiceProblems, eInvoiceStatus } from "@/lib/workforce/e-invoice"
import { getEInvoiceXmlApi } from "@/lib/api/work-billing-api"
import { translateError } from "@/lib/errors/translate-error"
import { useInvoiceMutations } from "@/hooks/workforce/use-work-billing"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { EInvoiceStatus, type ClientInvoice } from "@/types/work-billing"
import type { CompanySettings } from "@/types/work-settings"
import type { Client } from "@/types/workforce"
import { E_INVOICE_STATUS_CLASS, E_INVOICE_STATUS_LABEL } from "./billing-labels"

/** Saves the XML text as a file. */
function saveXml(fileName: string, xml: string) {
  const url = URL.createObjectURL(new Blob([xml], { type: "application/xml;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** DGI e-invoice block of an issued invoice: status, XML file and sending (Phase 6e.2). */
export function EInvoicePanel({ invoice, company, client, canEdit }: { invoice: ClientInvoice; company: CompanySettings; client?: Client; canEdit: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const m = useInvoiceMutations()
  const status = eInvoiceStatus(invoice, company)
  if (!status) return null

  const state = invoice.eInvoice
  const problems = eInvoiceProblems(invoice, company, client)
  const canSend = canEdit && (status === EInvoiceStatus.TO_SEND || status === EInvoiceStatus.REJECTED)
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "")

  const download = async () => {
    try {
      const { fileName, xml } = await getEInvoiceXmlApi(workspace.id, invoice.id)
      saveXml(fileName, xml)
    } catch (err) {
      toast.error(translateError(err, t))
    }
  }

  return (
    <section aria-labelledby="einvoice-title" className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-muted-foreground" />
          <h3 id="einvoice-title" className="text-sm font-semibold">{t("eInvoiceTitle")}</h3>
        </div>
        <Badge variant="outline" className={cn("font-normal", E_INVOICE_STATUS_CLASS[status])}>{t(E_INVOICE_STATUS_LABEL[status])}</Badge>
      </div>

      <dl className="mt-3 grid gap-1 text-sm">
        {state?.sentAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("eInvoiceSentAt")}</dt><dd>{when(state.sentAt)}</dd></div>}
        {state?.reference && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("eInvoiceReference")}</dt><dd className="font-mono text-xs">{state.reference}</dd></div>}
        {state?.decidedAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("eInvoiceDecidedAt")}</dt><dd>{when(state.decidedAt)}</dd></div>}
      </dl>
      {state?.reason && <p className="mt-2 text-sm text-destructive">{translateError(new Error(state.reason), t)}</p>}
      {canSend && problems.length > 0 && (
        <ul className="mt-2 list-disc ps-4 text-sm text-warning-foreground">
          {problems.map((p) => <li key={p}>{translateError(new Error(p), t)}</li>)}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={download}>
          <FileCode className="size-4" />
          {t("eInvoiceDownloadXml")}
        </Button>
        {canSend && (
          <Button size="sm" disabled={problems.length > 0 || m.sendEInvoice.isPending} onClick={() => m.sendEInvoice.mutate(invoice.id)}>
            <Upload className="size-4" />
            {t(status === EInvoiceStatus.REJECTED ? "eInvoiceResend" : "eInvoiceSend")}
          </Button>
        )}
        {canEdit && status === EInvoiceStatus.SENT && (
          <Button size="sm" variant="outline" disabled={m.checkEInvoice.isPending} onClick={() => m.checkEInvoice.mutate(invoice.id)}>
            <RefreshCw className="size-4" />
            {t("eInvoiceCheckStatus")}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("eInvoiceSimulatedHint")}</p>
    </section>
  )
}
