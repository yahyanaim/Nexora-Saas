"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Ban,
  CheckCircle2,
  Pencil,
  ShieldCheck,
  ShieldQuestion,
} from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../data-table-chunks/data-table-row-actions"
import { User, UserStatus } from "@/types/users"
import { SpaceAvatar } from "@/components/ui/space-avatar"

export interface UsersColumnActions {
  onView: (user: User) => void
  onSuspend: (user: User) => void
  onActivate: (user: User) => void
  onDelete: (user: User) => void
  onEdit: (user: User) => void
}

export function getStaffsColumns(
  actions: UsersColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<User>[] {
  const STATUS_CONFIG: Record<
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
                {user.userType && (
                  <Badge
                    variant="outline"
                    className="border-transparent px-1.5 py-0 text-[10px] capitalize md:text-xs"
                    style={{
                      backgroundColor: `${user.profileColor}1A`,
                      color: user.profileColor,
                    }}
                  >
                    {t(user.userType)}
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
      accessorKey: "roles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("roles")} />
      ),
      cell: ({ row }) => {
        const roles = row.original.roles ?? []

        if (roles.length === 0) {
          return (
            <span className="text-sm text-muted-foreground">
              {t("noRoles")}
            </span>
          )
        }

        const visible = roles.slice(0, 2)
        const remaining = roles.length - visible.length

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((role) => (
              <Badge
                key={role.id}
                variant="secondary"
                className="gap-1 font-normal"
              >
                <ShieldCheck className="size-3" />
                {role.name}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="font-normal">
                +{remaining}
              </Badge>
            )}
          </div>
        )
      },
    },

    {
      id: "permissions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("permissions")} />
      ),
      cell: ({ row }) => {
        const roles = row.original.roles ?? []

        const permissions = Array.from(
          new Set(roles.flatMap((role) => role.permissions ?? []))
        )

        if (permissions.length === 0) {
          return (
            <span className="text-sm text-muted-foreground">
              {t("noPermissions")}
            </span>
          )
        }

        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                <ShieldQuestion className="size-3.5" />
                {t("permissionsCount", { count: permissions.length })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 bg-background" align="start">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("allPermissions")}
              </div>
              <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                {permissions.map((p) => (
                  <Badge
                    key={p}
                    variant="secondary"
                    className="grow font-normal"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )
      },
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
                //   label: t("deleteStaff"),
                //   icon: Trash2,
                //   variant: "destructive",
                //   separatorBefore: true,
                //   onClick: actions.onDelete,
                // },
              ]
            : [
                { label: t("edit"), icon: Pencil, onClick: actions.onEdit },
                {
                  label: t("banStaff"),
                  icon: Ban,
                  variant: "destructive",
                  separatorBefore: true,
                  onClick: actions.onSuspend,
                },
                // {
                //   label: t("deleteStaff"),
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
