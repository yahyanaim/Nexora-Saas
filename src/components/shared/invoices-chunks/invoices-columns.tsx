"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "@/components/shared/data-table-chunks/data-table-row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { Invoice, InvoiceMethod, InvoiceStatus } from "@/types/invoices"
import {
  Eye,
  Send,
  Download,
  Ban,
  CheckCircle,
  Pencil,
  Copy,
  Printer,
  XCircle,
  Bell,
} from "lucide-react"
import { SpaceAvatar } from "@/components/ui/space-avatar"

export interface InvoicesColumnActions {
  onView: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onDownload: (invoice: Invoice) => void
  onSend: (invoice: Invoice) => void
  onMarkAsPaid: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onDuplicate?: (invoice: Invoice) => void
  onPrint?: (invoice: Invoice) => void
  onCancel?: (invoice: Invoice) => void
  onSendReminder?: (invoice: Invoice) => void
}

export function getInvoicesColumns(
  actions: InvoicesColumnActions,
  t: (key: string) => string
): ColumnDef<Invoice, any>[] {
  const STATUS_CONFIG: Record<
    InvoiceStatus,
    { label: string; className: string }
  > = {
    [InvoiceStatus.PAID]: {
      label: t("paid"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [InvoiceStatus.PENDING]: {
      label: t("pending"),
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    },
    [InvoiceStatus.OVERDUE]: {
      label: t("overdue"),
      className: "bg-destructive/10 text-destructive border-transparent",
    },
    [InvoiceStatus.CANCELLED]: {
      label: t("cancelled"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
    [InvoiceStatus.DRAFT]: {
      label: t("draft"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
  }

  return [
    {
      id: "customer",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customer")} />
      ),
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              name={invoice.user.name}
              profileColor={invoice.user.profileColor}
              src={invoice.user.avatar || ""}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium md:text-base">
                {invoice.user.name}
              </p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {invoice.user.email}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: "invoiceNumber",
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("invoice")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.original.invoiceNumber}
        </span>
      ),
    },
    {
      id: "amount",
      accessorFn: (row) => row.total,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("amount")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          ${row.original.total.toFixed(2)}
        </span>
      ),
    },
    {
      id: "method",
      accessorKey: "method",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("method")} />
      ),
      cell: ({ row }) => {
        const method = row.original.method
        const methodColors: Record<InvoiceMethod, string> = {
          [InvoiceMethod.STRIPE]:
            "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
          [InvoiceMethod.PAYPAL]:
            "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          [InvoiceMethod.BANK_TRANSFER]:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          [InvoiceMethod.CARD]:
            "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        }
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${methodColors[method] || "bg-muted text-muted-foreground"}`}
          >
            {method}
          </span>
        )
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status")} />
      ),
      cell: ({ row }) => (
        <StatusBadge value={row.original.status} config={STATUS_CONFIG} />
      ),
    },
    {
      id: "date",
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("date")} />
      ),
      cell: ({ row }) => {
        const date = row.original.date
        return (
          <span className="text-sm tabular-nums">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original
        const rowActions: RowAction<Invoice>[] = []

        rowActions.push({
          label: t("view"),
          icon: Eye,
          onClick: actions.onView,
        })

        rowActions.push({
          label: t("edit"),
          icon: Pencil,
          onClick: actions.onEdit,
        })

        if (actions.onDuplicate) {
          rowActions.push({
            label: t("duplicate"),
            icon: Copy,
            onClick: actions.onDuplicate,
          })
        }

        rowActions.push({
          label: t("download"),
          icon: Download,
          separatorBefore: true,
          onClick: actions.onDownload,
        })

        if (actions.onPrint) {
          rowActions.push({
            label: t("print"),
            icon: Printer,
            onClick: actions.onPrint,
          })
        }

        if (
          invoice.status !== InvoiceStatus.PAID &&
          invoice.status !== InvoiceStatus.CANCELLED
        ) {
          rowActions.push({
            label: t("send"),
            icon: Send,
            onClick: actions.onSend,
          })
        }

        if (
          actions.onSendReminder &&
          (invoice.status === InvoiceStatus.PENDING ||
            invoice.status === InvoiceStatus.OVERDUE)
        ) {
          rowActions.push({
            label: t("sendReminder"),
            icon: Bell,
            onClick: actions.onSendReminder,
          })
        }

        if (
          invoice.status === InvoiceStatus.PENDING ||
          invoice.status === InvoiceStatus.OVERDUE
        ) {
          rowActions.push({
            label: t("markAsPaid"),
            icon: CheckCircle,
            variant: "default",
            separatorBefore: true,
            onClick: actions.onMarkAsPaid,
          })
        }

        if (
          actions.onCancel &&
          (invoice.status === InvoiceStatus.DRAFT ||
            invoice.status === InvoiceStatus.PENDING)
        ) {
          rowActions.push({
            label: t("cancel"),
            icon: XCircle,
            variant: "destructive",
            onClick: actions.onCancel,
          })
        }

        if (invoice.status !== InvoiceStatus.PAID) {
          rowActions.push({
            label: t("delete"),
            icon: Ban,
            variant: "destructive",
            separatorBefore: true,
            onClick: actions.onDelete,
          })
        }

        return <DataTableRowActions row={invoice} actions={rowActions} />
      },
    },
  ]
}
