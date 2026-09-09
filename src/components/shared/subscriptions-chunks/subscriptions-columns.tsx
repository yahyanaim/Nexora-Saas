"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Ban,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  CheckCircle,
  RefreshCw,
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "@/components/shared/data-table-chunks/data-table-row-actions"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Subscription, SubscriptionStatus } from "@/types/subscriptions"

export interface SubscriptionsColumnActions {
  onViewUser: (subscription: Subscription) => void
  onEdit: (subscription: Subscription) => void
  onDelete: (subscription: Subscription) => void
  onCancel: (subscription: Subscription) => void
  onActivate?: (subscription: Subscription) => void
  onViewDetails?: (subscription: Subscription) => void
  onRenew?: (subscription: Subscription) => void
}

export function getSubscriptionsColumns(
  actions: SubscriptionsColumnActions,
  t: (key: string) => string
): ColumnDef<Subscription, any>[] {
  const STATUS_CONFIG: Record<
    SubscriptionStatus,
    { label: string; className: string }
  > = {
    [SubscriptionStatus.ACTIVE]: {
      label: t("active"),
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent",
    },

    [SubscriptionStatus.INACTIVE]: {
      label: t("inactive"),
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-transparent",
    },

    [SubscriptionStatus.CANCELED]: {
      label: t("canceled"),
      className:
        "bg-red-500/10 text-red-700 dark:text-red-400 border-transparent",
    },

    [SubscriptionStatus.EXPIRED]: {
      label: t("expired"),
      className:
        "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-transparent",
    },

    [SubscriptionStatus.PAST_DUE]: {
      label: t("pastDue"),
      className:
        "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-transparent",
    },
  }

  return [
    {
      id: "user",
      accessorFn: (row) => row.user?.name ?? row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("user")} />
      ),
      cell: ({ row }) => {
        const sub = row.original
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              name={sub.user?.name ?? sub.name}
              src={sub.user?.avatar || ""}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium md:text-base">
                {sub.user?.name ?? sub.name}
              </p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {sub.user?.email ?? sub.description}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: "planName",
      accessorFn: (row) => row.plan?.name ?? row.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("plan")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.plan?.name ?? row.original.name}
        </span>
      ),
    },
    {
      id: "price",
      accessorFn: (row) => row.plan?.price ?? row.price,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("price")} />
      ),
      cell: ({ row }) => {
        const plan = row.original.plan
        const price = row.original.price
        return (
          <span className="text-sm tabular-nums">
            {plan ? `$${plan.price}` : price}
            <span className="text-muted-foreground">
              {" "}
              / {plan?.period ?? row.original.period ?? t("month")}
            </span>
          </span>
        )
      },
    },
    {
      accessorKey: "billingCycle",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("billingCycle")} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
          {row.original.billingCycle ?? t("monthly")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status")} />
      ),
      cell: ({ row }) => (
        <StatusBadge value={row.original.status} config={STATUS_CONFIG} />
      ),
    },
    {
      accessorKey: "nextBilling",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("nextBilling")} />
      ),
      cell: ({ row }) => {
        const date = row.original.nextBilling
        return date ? (
          <span className="text-sm tabular-nums">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sub = row.original
        const rowActions: RowAction<Subscription>[] = []

        rowActions.push({
          label: t("viewUser"),
          icon: ExternalLink,
          onClick: actions.onViewUser,
        })

        if (actions.onViewDetails) {
          rowActions.push({
            label: t("viewDetails"),
            icon: Eye,
            onClick: actions.onViewDetails,
          })
        }

        rowActions.push({
          label: t("edit"),
          icon: Pencil,
          separatorBefore: true,
          onClick: actions.onEdit,
        })

        if (
          actions.onActivate &&
          (sub.status === SubscriptionStatus.INACTIVE ||
            sub.status === SubscriptionStatus.CANCELED)
        ) {
          rowActions.push({
            label: t("activate"),
            icon: CheckCircle,
            onClick: actions.onActivate,
          })
        }

        if (sub.status === SubscriptionStatus.ACTIVE) {
          rowActions.push({
            label: t("cancel"),
            icon: Ban,
            variant: "destructive",
            separatorBefore: true,
            onClick: actions.onCancel,
          })
        }

        if (
          actions.onRenew &&
          (sub.status === SubscriptionStatus.EXPIRED ||
            sub.status === SubscriptionStatus.PAST_DUE)
        ) {
          rowActions.push({
            label: t("renew"),
            icon: RefreshCw,
            onClick: actions.onRenew,
          })
        }

        rowActions.push({
          label: t("delete"),
          icon: Trash2,
          variant: "destructive",
          separatorBefore: true,
          onClick: actions.onDelete,
        })

        return <DataTableRowActions row={sub} actions={rowActions} />
      },
    },
  ]
}
