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
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices, useInvoiceMutations, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { unbilledExpenses } from "@/lib/workforce/profitability"
import { addDays, displayStatus, invoiceBalance, invoiceTotals, toBase, unbilledValueByClient } from "@/lib/workforce/billing"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ClientInvoiceStatus, InvoiceKind, type ClientInvoice, type ClientInvoiceDisplayStatus } from "@/types/work-billing"
import { ClientStatus, type Client } from "@/types/workforce"
import { formatMoney, includesFilter } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import { CreateInvoiceSheet } from "./create-invoice-sheet"
import { InvoiceSheet } from "./invoice-sheet"
import { NewInvoiceSheet } from "./new-invoice-sheet"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL, formatHours } from "./billing-labels"

const DISPLAY_STATUSES: ClientInvoiceDisplayStatus[] = [
  ClientInvoiceStatus.DRAFT,
  ClientInvoiceStatus.ISSUED,
  ClientInvoiceStatus.SENT,
  "partially_paid",
  "overdue",
  ClientInvoiceStatus.PAID,
  "credited",
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
  const { data: tasks = [] } = useTasks()
  const m = useInvoiceMutations()
  const { data: settings } = useWorkspaceSettings()
  const canCreate = can(authedUser, AdminPermissionsPlatform.INVOICES_CREATE)
  const canEdit = can(authedUser, AdminPermissionsPlatform.INVOICES_UPDATE)

  const [billing, setBilling] = useState<Client | null>(null)
  const [creating, setCreating] = useState(false)
  const { data: milestones = [] } = useMilestones()
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
    // Amounts in the base currency: what's still owed, and money received (BIL-7)
    const owed = (list: ClientInvoice[]) => list.reduce((s, i) => s + toBase(invoiceBalance(i, invoices), i), 0)
    const open = invoices.filter((i) => invoiceBalance(i, invoices) > 0)
    const overdue = open.filter((i) => displayStatus(i, today, invoices) === "overdue")
    const since = addDays(today, -30)
    const received = invoices.flatMap((i) => (i.payments ?? []).filter((p) => p.date >= since).map((p) => toBase(p.amount, i)))
    const paidCount = invoices.filter((i) => (i.payments ?? []).some((p) => p.date >= since)).length
    const ready = [...unbilled.values()].reduce((s, v) => s + v.amount, 0)
    return [
      { key: "outstanding", title: t("outstanding"), value: money(owed(open)), footer: { icon: Clock, text: t("sentInvoicesCount", { count: open.length }) } },
      { key: "overdue", title: t("overdue"), value: money(owed(overdue)), valueClassName: overdue.length ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("pastDueCount", { count: overdue.length }) } },
      { key: "paid", title: t("paidLast30Days"), value: money(received.reduce((s, n) => s + n, 0)), valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("invoicesCount", { count: paidCount }) } },
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
          <button type="button" onClick={() => setOpenId(row.original.id)} className="flex items-center gap-2 font-mono text-sm font-medium hover:text-primary">
            {row.original.number || <span className="font-sans text-muted-foreground">{t("draftInvoice")}</span>}
            {row.original.kind === InvoiceKind.CREDIT_NOTE && <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] text-muted-foreground">{t("creditNote")}</span>}
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
          <span className={displayStatus(row.original, todayIso(), invoices) === "overdue" ? "text-sm font-medium text-destructive tabular-nums" : "text-sm tabular-nums"}>
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
        id: "balance",
        accessorFn: (i) => invoiceBalance(i, invoices),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("balanceDue")} />,
        cell: ({ row }) => {
          const balance = invoiceBalance(row.original, invoices)
          return <span className="text-sm tabular-nums text-muted-foreground">{balance > 0 ? formatMoney(balance, row.original.currency, locale) : "—"}</span>
        },
      },
      {
        id: "status",
        accessorFn: (i) => displayStatus(i, todayIso(), invoices),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => {
          const status = displayStatus(row.original, todayIso(), invoices)
          return (
            <Badge variant="outline" className={INVOICE_STATUS_CLASS[status]}>
              {t(INVOICE_STATUS_LABEL[status])}
            </Badge>
          )
        },
      },
    ],
    [t, locale, clients, invoices]
  )

  const readyClients = clients.filter((c) => unbilled.has(c.id))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t("newInvoice")}
            </Button>
          )
        }
      />
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
        tasks={tasks}
        invoices={invoices}
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

      {creating && (
        <NewInvoiceSheet
          open
          clients={clients.filter((c) => c.status !== ClientStatus.ARCHIVED)}
          projects={projects}
          milestones={milestones}
          invoices={invoices}
          currency={workspace.currency}
          isSubmitting={m.create.isPending}
          onOpenChange={setCreating}
          onCreate={(input) =>
            m.create.mutate(input, {
              onSuccess: (invoice) => {
                setCreating(false)
                setOpenId(invoice.id)
              },
            })
          }
        />
      )}

      <InvoiceSheet
        key={`invoice:${opened?.id ?? ""}:${opened?.updatedAt ?? ""}`}
        invoice={opened}
        allInvoices={invoices}
        client={clients.find((c) => c.id === opened?.clientId)}
        company={settings?.company}
        canEdit={canEdit}
        busy={m.markSent.isPending || m.issue.isPending || m.recordPayment.isPending || m.voidInvoice.isPending || m.deleteDraft.isPending || m.creditNote.isPending}
        onOpenChange={(open) => !open && setOpenId(null)}
        onSaveDraft={(id, input) => m.updateDraft.mutate({ id, input })}
        onIssue={(id) => m.issue.mutate(id)}
        onSend={(id) => m.markSent.mutate(id)}
        onPayment={(id, payment) => m.recordPayment.mutate({ id, payment })}
        onCreditNote={(id, input) => m.creditNote.mutate({ id, input }, { onSuccess: (cn) => setOpenId(cn.id) })}
        onOpenInvoice={setOpenId}
        onVoid={(id) => m.voidInvoice.mutate(id)}
        onDelete={(id) => m.deleteDraft.mutate(id, { onSuccess: () => setOpenId(null) })}
      />
    </div>
  )
}
