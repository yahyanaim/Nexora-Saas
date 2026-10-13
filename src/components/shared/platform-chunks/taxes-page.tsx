"use client"

import { useTranslations } from "next-intl"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { SortableHead, TablePager, useTableControls } from "@/components/shared/table-controls"
import type { Sorters } from "@/lib/ui/table-sort"
import { useNxInvoices, useNxPayments, useTaxRates } from "@/hooks/platform/use-platform-billing"
import { vatByMonth } from "@/lib/api/platform-billing-api"
import { Panel, useBillingFormat } from "./billing-shared"

/** VAT rates with their dates and legal reference, and VAT collected on payments received (TAX-01 to TAX-04). */
const SORTERS: Sorters<{ month: string; received: number; vat: number }> = { month: (r) => r.month, received: (r) => r.received, vat: (r) => r.vat }

export default function ConsoleTaxesPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const { data: rates = [] } = useTaxRates()
  const { data: payments = [] } = useNxPayments()
  const { data: invoices = [] } = useNxInvoices()
  const months = vatByMonth(payments, invoices)
  const ctl = useTableControls(months, SORTERS, { key: "month", dir: "desc" }, 12)
  const monthLabel = (m: string) => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <Panel title={t("txRates")} hint={t("txRatesHint")}>
        <TableContainer>
          <Table>
            <TableHeader><TableRow><TableHead>{t("txLabel")}</TableHead><TableHead className="text-end">{t("txRate")}</TableHead><TableHead>{t("plFrom")}</TableHead><TableHead>{t("txReference")}</TableHead></TableRow></TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-end tabular-nums">{r.rate} %</TableCell>
                  <TableCell>{date(r.from)}{r.to ? ` → ${date(r.to)}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.reference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
      <Panel title={t("txSummary")} hint={t("txSummaryHint")}>
        <TableContainer>
          <Table>
            <TableHeader><TableRow><SortableHead label={t("txMonth")} k="month" ctl={ctl} /><SortableHead label={t("txReceived")} k="received" ctl={ctl} align="end" /><SortableHead label={t("txVatCollected")} k="vat" ctl={ctl} align="end" /></TableRow></TableHeader>
            <TableBody>
              {ctl.rows.map((r) => (
                <TableRow key={r.month}>
                  <TableCell className="capitalize">{monthLabel(r.month)}</TableCell>
                  <TableCell className="text-end tabular-nums">{money(r.received)}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">{money(r.vat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager ctl={ctl} className="px-4 pb-3" />
        </TableContainer>
        <p className="mt-3 text-xs text-muted-foreground">{t("txConfirm")}</p>
      </Panel>
    </div>
  )
}
