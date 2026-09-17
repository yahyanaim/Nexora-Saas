// components/projects/projects-columns.tsx

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "@/components/shared/data-table-chunks/data-table-row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { Project, ProjectStatus } from "@/types/projects"
import {
  Eye,
  Archive,
  Trash2,
  Pencil,
  Copy,
  CheckCircle,
  RotateCw,
  Download,
} from "@/components/ui/carbon/icons"
import { SpaceAvatar } from "@/components/ui/space-avatar"

export interface ProjectsColumnActions {
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onArchive: (project: Project) => void
  onDelete: (project: Project) => void
  onDuplicate?: (project: Project) => void
  onComplete?: (project: Project) => void
  onActivate?: (project: Project) => void
  onExport?: (project: Project) => void
}

export function getProjectsColumns(
  actions: ProjectsColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<Project>[] {
  const STATUS_CONFIG: Record<
    ProjectStatus,
    { label: string; className: string }
  > = {
    [ProjectStatus.ACTIVE]: {
      label: t("active"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [ProjectStatus.ARCHIVED]: {
      label: t("archived"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
    [ProjectStatus.COMPLETED]: {
      label: t("completed"),
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    },
    [ProjectStatus.ON_HOLD]: {
      label: t("onHold"),
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    },
  }

  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("project")} />
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <div>
            <p className="text-sm font-medium">{project.name}</p>
            {project.description && (
              <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: "owner",
      accessorFn: (row) => row.owner.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("owner")} />
      ),
      cell: ({ row }) => {
        const project = row.original
        return (
          <div className="flex items-center gap-2">
            <SpaceAvatar
              name={project.owner.name}
              src={project.owner.avatar || ""}
              profileColor={project.owner.profileColor}
              size="xs"
            />
            <span className="text-sm">{project.owner.name}</span>
          </div>
        )
      },
    },
    {
      id: "members",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("members")} />
      ),
      cell: ({ row }) => {
        const project = row.original
        const MAX_VISIBLE = 3
        const visibleMembers = project.members.slice(0, MAX_VISIBLE)
        const remaining = project.members.length - MAX_VISIBLE

        return (
          <div className="flex items-center">
            {visibleMembers.map((m, index) => (
              <div
                key={m.user.id}
                className="h-8 w-8"
                style={{
                  marginLeft: index === 0 ? 0 : "-8px",
                  zIndex: visibleMembers.length - index,
                }}
              >
                <SpaceAvatar
                  name={m.user.name}
                  profileColor={m.user.profileColor}
                  src={m.user.avatar || ""}
                  size="xs"
                  className="h-8 w-8 rounded-full ring-2 ring-background"
                />
              </div>
            ))}
            {remaining > 0 && (
              <div
                className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background"
                style={{ marginLeft: "-8px", zIndex: 0 }}
              >
                +{remaining}
              </div>
            )}
          </div>
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
      id: "progress",
      accessorKey: "progress",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("progress")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${row.original.progress}%` }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums">{row.original.progress}%</span>
        </div>
      ),
    },
    {
      id: "updated",
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("updated")} />
      ),
      cell: ({ row }) => {
        const date = row.original.updatedAt
        const now = new Date()
        const updated = new Date(date)
        const diffMs = now.getTime() - updated.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffHr = Math.floor(diffMs / 3600000)
        const diffDay = Math.floor(diffMs / 86400000)

        let timeAgo
        if (diffMin < 1) timeAgo = t("justNow")
        else if (diffMin < 60) timeAgo = t("minutesAgo", { count: diffMin })
        else if (diffHr < 24) timeAgo = t("hoursAgo", { count: diffHr })
        else if (diffDay < 7) timeAgo = t("daysAgo", { count: diffDay })
        else timeAgo = updated.toLocaleDateString()

        return <span className="text-sm">{timeAgo}</span>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original
        const rowActions: RowAction<Project>[] = []

        // View
        rowActions.push({
          label: t("view"),
          icon: Eye,
          onClick: actions.onView,
        })

        // Edit
        rowActions.push({
          label: t("edit"),
          icon: Pencil,
          onClick: actions.onEdit,
        })

        // Duplicate
        if (actions.onDuplicate) {
          rowActions.push({
            label: t("duplicate"),
            icon: Copy,
            onClick: actions.onDuplicate,
          })
        }

        // Complete (for ACTIVE or ON_HOLD projects)
        if (
          actions.onComplete &&
          (project.status === ProjectStatus.ACTIVE ||
            project.status === ProjectStatus.ON_HOLD)
        ) {
          rowActions.push({
            label: t("markAsCompleted"),
            icon: CheckCircle,
            variant: "default",
            separatorBefore: true,
            onClick: actions.onComplete,
          })
        }

        // Activate (for ARCHIVED projects)
        if (actions.onActivate && project.status === ProjectStatus.ARCHIVED) {
          rowActions.push({
            label: t("activate"),
            icon: RotateCw,
            onClick: actions.onActivate,
          })
        }

        // Archive (for ACTIVE, ON_HOLD, COMPLETED projects)
        if (
          project.status !== ProjectStatus.ARCHIVED &&
          project.status !== ProjectStatus.COMPLETED
        ) {
          rowActions.push({
            label: t("archive"),
            icon: Archive,
            separatorBefore: true,
            onClick: actions.onArchive,
          })
        }

        // Export
        if (actions.onExport) {
          rowActions.push({
            label: t("export"),
            icon: Download,
            onClick: actions.onExport,
          })
        }

        // Delete (always show)
        rowActions.push({
          label: t("delete"),
          icon: Trash2,
          variant: "destructive",
          separatorBefore: true,
          onClick: actions.onDelete,
        })

        return <DataTableRowActions row={project} actions={rowActions} />
      },
    },
  ]
}
