"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, CheckCircle, Clock, Receipt, Plus } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices, useInvoiceMutations, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { unbilledExpenses } from "@/lib/workforce/profitability"
import { addDays, displayStatus, invoiceTotals, unbilledValueByClient } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ClientInvoiceStatus, type ClientInvoice, type ClientInvoiceDisplayStatus } from "@/types/work-billing"
import type { Client } from "@/types/workforce"
import { formatMoney, includesFilter } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import { CreateInvoiceSheet } from "./create-invoice-sheet"
import { InvoiceSheet } from "./invoice-sheet"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL, formatHours } from "./billing-labels"

const DISPLAY_STATUSES: ClientInvoiceDisplayStatus[] = [
  ClientInvoiceStatus.DRAFT,
  ClientInvoiceStatus.SENT,
  "overdue",
  ClientInvoiceStatus.PAID,
  ClientInvoiceStatus.VOID,
]

export default function ClientInvoicesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: invoices = [], isLoading } = useClientInvoices()
  const { data: entries = [] } = useTimeEntries()
  const { data: expenses = [] } = useExpenses()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  const m = useInvoiceMutations()
  const canCreate = can(authedUser, AdminPermissionsPlatform.INVOICES_CREATE)
  const canEdit = can(authedUser, AdminPermissionsPlatform.INVOICES_UPDATE)

  const [billing, setBilling] = useState<Client | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = invoices.find((i) => i.id === openId) ?? null

  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  // Approved hours plus billable expenses that aren't on an invoice yet, per client
  const unbilled = useMemo(() => {
    const totals = unbilledValueByClient(entries, projects, employees, clients)
    for (const client of clients) {
      const extra = unbilledExpenses(expenses, projects, client.id).reduce((s, x) => s + x.amount, 0)
      if (extra > 0) {
        const current = totals.get(client.id) ?? { hours: 0, amount: 0 }
        totals.set(client.id, { hours: current.hours, amount: current.amount + extra })
      }
    }
    return totals
  }, [entries, expenses, projects, employees, clients])

  const cards = useMemo<MetricCardItem[]>(() => {
    const money = (n: number) => formatMoney(n, workspace.currency, locale)
    const today = todayIso()
    const totalOf = (list: ClientInvoice[]) => list.reduce((s, i) => s + invoiceTotals(i).total, 0)
    const open = invoices.filter((i) => i.status === ClientInvoiceStatus.SENT)
    const overdue = open.filter((i) => displayStatus(i, today) === "overdue")
    const since = addDays(today, -30)
    const paid = invoices.filter((i) => i.status === ClientInvoiceStatus.PAID && (i.paidAt ?? "").slice(0, 10) >= since)
    const ready = [...unbilled.values()].reduce((s, v) => s + v.amount, 0)
    return [
      { key: "outstanding", title: t("outstanding"), value: money(totalOf(open)), footer: { icon: Clock, text: t("sentInvoicesCount", { count: open.length }) } },
      { key: "overdue", title: t("overdue"), value: money(totalOf(overdue)), valueClassName: overdue.length ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("pastDueCount", { count: overdue.length }) } },
      { key: "paid", title: t("paidLast30Days"), value: money(totalOf(paid)), valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("invoicesCount", { count: paid.length }) } },
      { key: "ready", title: t("readyToBill"), value: money(ready), valueClassName: "text-primary", footer: { icon: Receipt, text: t("approvedUnbilledHours") } },
    ]
  }, [invoices, unbilled, t, locale, workspace.currency])

  const columns = useMemo<ColumnDef<ClientInvoice>[]>(
    () => [
      {
        accessorKey: "number",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("invoice")} />,
        filterFn: (row, _id, value: string) => {
          const q = String(value ?? "").toLowerCase()
          const client = clients.find((c) => c.id === row.original.clientId)?.name ?? ""
          return [row.original.number, client].some((s) => s.toLowerCase().includes(q))
        },
        cell: ({ row }) => (
          <button type="button" onClick={() => setOpenId(row.original.id)} className="font-mono text-sm font-medium hover:text-primary">
            {row.original.number}
          </button>
        ),
      },
      {
        id: "client",
        accessorFn: (i) => clients.find((c) => c.id === i.clientId)?.name ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("client")} />,
        cell: ({ getValue }) => <span className="text-sm">{String(getValue())}</span>,
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("issueDate")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatShortDate(row.original.issueDate, locale)}</span>,
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("dueDate")} />,
        cell: ({ row }) => (
          <span className={displayStatus(row.original) === "overdue" ? "text-sm font-medium text-destructive tabular-nums" : "text-sm tabular-nums"}>
            {formatShortDate(row.original.dueDate, locale)}
          </span>
        ),
      },
      {
        id: "total",
        accessorFn: (i) => invoiceTotals(i).total,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("total")} />,
        cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{formatMoney(invoiceTotals(row.original).total, row.original.currency, locale)}</span>,
      },
      {
        id: "status",
        accessorFn: (i) => displayStatus(i),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => {
          const status = displayStatus(row.original)
          return (
            <Badge variant="outline" className={INVOICE_STATUS_CLASS[status]}>
              {t(INVOICE_STATUS_LABEL[status])}
            </Badge>
          )
        },
      },
    ],
    [t, locale, clients]
  )

  const readyClients = clients.filter((c) => unbilled.has(c.id))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <header>
          <h2 className="text-base font-semibold">{t("readyToBill")}</h2>
          <p className="text-sm text-muted-foreground">{t("readyToBillHint")}</p>
        </header>
        {readyClients.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{t("nothingToBillAnyone")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readyClients.map((client) => {
              const value = unbilled.get(client.id)!
              return (
                <li key={client.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatHours(value.hours)} · {money(value.amount)}
                    </p>
                  </div>
                  {canCreate && (
                    <Button size="sm" onClick={() => setBilling(client)}>
                      <Plus className="size-4" />
                      {t("createInvoice")}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <DataTable
        title={t("invoices")}
        isLoading={isLoading}
        columns={columns}
        data={invoices}
        searchColumnId="number"
        searchPlaceholder={t("searchInvoices")}
        exportFilename="client-invoices"
        filters={[{ columnId: "status", title: t("status"), options: DISPLAY_STATUSES.map((s) => ({ label: t(INVOICE_STATUS_LABEL[s]), value: s })) }]}
      />

      <CreateInvoiceSheet
        key={`create:${billing?.id ?? ""}`}
        client={billing}
        entries={entries}
        expenses={expenses}
        projects={projects}
        employees={employees}
        currency={workspace.currency}
        isSubmitting={m.createFromHours.isPending}
        onOpenChange={(open) => !open && setBilling(null)}
        onCreate={(input) =>
          m.createFromHours.mutate(input, {
            onSuccess: (invoice) => {
              setBilling(null)
              setOpenId(invoice.id)
            },
          })
        }
      />

      <InvoiceSheet
        key={`invoice:${opened?.id ?? ""}:${opened?.updatedAt ?? ""}`}
        invoice={opened}
        client={clients.find((c) => c.id === opened?.clientId)}
        canEdit={canEdit}
        busy={m.markSent.isPending || m.markPaid.isPending || m.voidInvoice.isPending || m.deleteDraft.isPending}
        onOpenChange={(open) => !open && setOpenId(null)}
        onSaveDraft={(id, input) => m.updateDraft.mutate({ id, input })}
        onSend={(id) => m.markSent.mutate(id)}
        onPaid={(id) => m.markPaid.mutate(id)}
        onVoid={(id) => m.voidInvoice.mutate(id)}
        onDelete={(id) => m.deleteDraft.mutate(id, { onSuccess: () => setOpenId(null) })}
      />
    </div>
  )
}
