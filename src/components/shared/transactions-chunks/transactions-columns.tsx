"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "@/components/shared/data-table-chunks/data-table-row-actions"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Transaction,
  TransactionStatus,
  TransactionMethod,
} from "@/types/transactions"
import {
  Eye,
  Ban,
  RotateCcw,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  FileText,
  Printer,
} from "lucide-react"

export interface TransactionsColumnActions {
  onView: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onRefund: (transaction: Transaction) => void
  onCancel: (transaction: Transaction) => void
  onRetry?: (transaction: Transaction) => void
  onMarkAsPaid?: (transaction: Transaction) => void
  onDownloadReceipt?: (transaction: Transaction) => void
  onPrint?: (transaction: Transaction) => void
}

export function getTransactionsColumns(
  actions: TransactionsColumnActions,
  t: (key: string) => string
): ColumnDef<Transaction, any>[] {
  const STATUS_CONFIG: Record<
    TransactionStatus,
    { label: string; className: string }
  > = {
    [TransactionStatus.PAID]: {
      label: t("paid"),
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent",
    },

    [TransactionStatus.PENDING]: {
      label: t("pending"),
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent",
    },

    [TransactionStatus.FAILED]: {
      label: t("failed"),
      className:
        "bg-red-500/10 text-red-700 dark:text-red-400 border-transparent",
    },

    [TransactionStatus.CANCELED]: {
      label: t("canceled"),
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-transparent",
    },

    [TransactionStatus.REFUNDED]: {
      label: t("refunded"),
      className:
        "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent",
    },
  }

  const METHOD_CONFIG: Record<TransactionMethod, string> = {
    [TransactionMethod.STRIPE]:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    [TransactionMethod.PAYPAL]:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    [TransactionMethod.CARD]:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    [TransactionMethod.BANK_TRANSFER]:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  }

  return [
    {
      id: "user",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("user")} />
      ),
      cell: ({ row }) => {
        const txn = row.original
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              name={txn.user.name}
              src={txn.user.avatar || ""}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium md:text-base">
                {txn.user.name}
              </p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {txn.user.email}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: "amount",
      accessorFn: (row) => row.amount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("amount")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          ${row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      id: "method",
      accessorKey: "method",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("method")} />
      ),
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            METHOD_CONFIG[row.original.method] ||
            "bg-muted text-muted-foreground"
          }`}
        >
          {t(row.original.method.toLowerCase())}
        </span>
      ),
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
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("date")} />
      ),
      cell: ({ row }) => {
        const date = row.original.createdAt || row.original.updatedAt || ""
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
        const txn = row.original
        const rowActions: RowAction<Transaction>[] = []

        rowActions.push({
          label: t("view"),
          icon: Eye,
          onClick: actions.onView,
        })

        rowActions.push({
          label: t("edit"),
          icon: Pencil,
          separatorBefore: true,
          onClick: actions.onEdit,
        })

        if (actions.onMarkAsPaid && txn.status === TransactionStatus.PENDING) {
          rowActions.push({
            label: t("markAsPaid"),
            icon: CheckCircle,
            onClick: actions.onMarkAsPaid,
          })
        }

        if (actions.onRetry && txn.status === TransactionStatus.FAILED) {
          rowActions.push({
            label: t("retry"),
            icon: RefreshCw,
            onClick: actions.onRetry,
          })
        }

        if (txn.status === TransactionStatus.PAID) {
          rowActions.push({
            label: t("refund"),
            icon: RotateCcw,
            variant: "default",
            separatorBefore: true,
            onClick: actions.onRefund,
          })
        }

        if (txn.status === TransactionStatus.PENDING) {
          rowActions.push({
            label: t("cancel"),
            icon: Ban,
            variant: "destructive",
            separatorBefore: true,
            onClick: actions.onCancel,
          })
        }

        if (
          actions.onDownloadReceipt &&
          txn.status === TransactionStatus.PAID
        ) {
          rowActions.push({
            label: t("downloadReceipt"),
            icon: FileText,
            onClick: actions.onDownloadReceipt,
          })
        }

        if (actions.onPrint && txn.status === TransactionStatus.PAID) {
          rowActions.push({
            label: t("print"),
            icon: Printer,
            onClick: actions.onPrint,
          })
        }

        rowActions.push({
          label: t("delete"),
          icon: Trash2,
          variant: "destructive",
          separatorBefore: true,
          onClick: actions.onDelete,
        })

        return <DataTableRowActions row={txn} actions={rowActions} />
      },
    },
  ]
}
