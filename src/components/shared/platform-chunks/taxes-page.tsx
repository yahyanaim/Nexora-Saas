"use client"

import { useTranslations } from "next-intl"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { useNxInvoices, useNxPayments, useTaxRates } from "@/hooks/platform/use-platform-billing"
import { vatByMonth } from "@/lib/api/platform-billing-api"
import { Panel, useBillingFormat } from "./billing-shared"

/** VAT rates with their dates and legal reference, and VAT collected on payments received (TAX-01 to TAX-04). */
export default function ConsoleTaxesPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const { data: rates = [] } = useTaxRates()
  const { data: payments = [] } = useNxPayments()
  const { data: invoices = [] } = useNxInvoices()
  const months = vatByMonth(payments, invoices)
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
            <TableHeader><TableRow><TableHead>{t("txMonth")}</TableHead><TableHead className="text-end">{t("txReceived")}</TableHead><TableHead className="text-end">{t("txVatCollected")}</TableHead></TableRow></TableHeader>
            <TableBody>
              {months.map((r) => (
                <TableRow key={r.month}>
                  <TableCell className="capitalize">{monthLabel(r.month)}</TableCell>
                  <TableCell className="text-end tabular-nums">{money(r.received)}</TableCell>
                  <TableCell className="text-end font-medium tabular-nums">{money(r.vat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <p className="mt-3 text-xs text-muted-foreground">{t("txConfirm")}</p>
      </Panel>
    </div>
  )
}
