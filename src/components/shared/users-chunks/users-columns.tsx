"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Ban, CheckCircle2, Pencil } from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../data-table-chunks/data-table-row-actions"
import { User, UserStatus, UserType } from "@/types/users"
import { SpaceAvatar } from "@/components/ui/space-avatar"

export interface UsersColumnActions {
  onView: (user: User) => void
  onSuspend: (user: User) => void
  onActivate: (user: User) => void
  onDelete: (user: User) => void
  onEdit: (user: User) => void
}

export function getUsersColumns(
  actions: UsersColumnActions,
  t: (key: string) => string
): ColumnDef<User>[] {
  const STATUS_CONFIG_TRANSLATED: Record<
    UserStatus,
    { label: string; className: string }
  > = {
    [UserStatus.ACTIVE]: {
      label: t("active"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [UserStatus.INACTIVE]: {
      label: t("inactive"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
    [UserStatus.NOT_VERIFIED]: {
      label: t("notVerified"),
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    },
    [UserStatus.BANNED]: {
      label: t("banned"),
      className: "bg-destructive/10 text-destructive border-transparent",
    },
    [UserStatus.DELETED]: {
      label: t("deleted"),
      className:
        "bg-muted text-muted-foreground line-through border-transparent",
    },
  }

  const TYPE_CONFIG_TRANSLATED: Record<
    UserType,
    { label: string; className: string }
  > = {
    [UserType.USER]: {
      label: t("userType"),
      className: "bg-gray-500/10 text-muted-foreground border-transparent",
    },
    [UserType.STAFF]: {
      label: t("staff"),
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    },
    [UserType.ADMIN]: {
      label: t("admin"),
      className: "bg-primary/10 text-primary border-transparent",
    },
  }

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("user")} />
      ),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              name={user?.name}
              src={user?.avatar}
              profileColor={user?.profileColor}
              size="sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium md:text-base">{user.name}</p>
              </div>
              <p className="text-xs text-muted-foreground md:text-sm">
                {user.username ? `@${user.username}` : (user.email ?? "—")}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("email")} />
      ),
      cell: ({ row }) => {
        const email = row.original.email
        return (
          <a
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </a>
        )
      },
    },
    {
      accessorKey: "userType",
      enableHiding: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("type")} />
      ),
      cell: ({ row }) => (
        <StatusBadge
          value={row.original.userType}
          config={TYPE_CONFIG_TRANSLATED}
        />
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status")} />
      ),
      cell: ({ row }) => (
        <StatusBadge
          value={row.original.status}
          config={STATUS_CONFIG_TRANSLATED}
        />
      ),
    },

    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        const rowActions: RowAction<User>[] =
          user.status === UserStatus.BANNED
            ? [
                { label: t("edit"), icon: Pencil, onClick: actions.onEdit },
                {
                  label: t("unban"),
                  icon: CheckCircle2,
                  onClick: actions.onActivate,
                },
                // {
                //   label: t("deleteUser"),
                //   icon: Trash2,
                //   variant: "destructive",
                //   separatorBefore: true,
                //   onClick: actions.onDelete,
                // },
              ]
            : [
                { label: t("edit"), icon: Pencil, onClick: actions.onEdit },
                {
                  label: t("banUser"),
                  icon: Ban,
                  variant: "destructive",
                  separatorBefore: true,
                  onClick: actions.onSuspend,
                },
                // {
                //   label: t("deleteUser"),
                //   icon: Trash2,
                //   variant: "destructive",
                //   onClick: actions.onDelete,
                // },
              ]
        return <DataTableRowActions row={user} actions={rowActions} />
      },
    },
  ]
}
