"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { CheckCircle2 } from "lucide-react"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../data-table-chunks/data-table-row-actions"
import { User, UserType } from "@/types/users"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Badge } from "@/components/ui/badge"

export interface UsersColumnActions {
  onActivate: (user: User) => void
}

export function getBannedUsersColumns(
  actions: UsersColumnActions,
  t: (key: string) => string
): ColumnDef<User>[] {
  const TYPE_CONFIG: Record<UserType, { label: string; className: string }> = {
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
                {user.status && (
                  <Badge
                    variant="destructive"
                    className="border-transparent px-1.5 py-0 text-[10px] capitalize md:text-xs"
                  >
                    {t(user.status)}
                  </Badge>
                )}
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
        <StatusBadge value={row.original.userType} config={TYPE_CONFIG} />
      ),
    },

    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        const rowActions: RowAction<User>[] = [
          {
            label: t("unban"),
            icon: CheckCircle2,
            onClick: actions.onActivate,
          },
        ]
        return <DataTableRowActions row={user} actions={rowActions} />
      },
    },
  ]
}
