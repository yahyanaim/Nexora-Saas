// components/files/files-columns.tsx

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "@/components/shared/data-table-chunks/data-table-row-actions"
import { FileItem, FileType, FileVisibility } from "@/types/files"
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  Download,
  Star,
  Pencil,
  Trash2,
  Share2,
  Copy,
  Info,
  FileUp,
  Globe,
  Lock,
  Users,
} from "lucide-react"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface FilesColumnActions {
  onPreview?: (file: FileItem) => void
  onDownload: (file: FileItem) => void
  onStar: (file: FileItem) => void
  onRename: (file: FileItem) => void
  onDelete: (file: FileItem) => void
  onShare: (file: FileItem) => void
  onMove?: (file: FileItem) => void
  onCopy?: (file: FileItem) => void
  onDuplicate?: (file: FileItem) => void
  onDetails?: (file: FileItem) => void
  onChangeVisibility?: (file: FileItem, visibility: FileVisibility) => void
}

// Helper function - format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const FILE_ICONS: Record<FileType, React.ReactNode> = {
  [FileType.FOLDER]: <Folder className="h-5 w-5 text-amber-500" />,
  [FileType.DOCUMENT]: <FileText className="h-5 w-5 text-blue-500" />,
  [FileType.IMAGE]: <Image className="h-5 w-5 text-purple-500" />,
  [FileType.VIDEO]: <Video className="h-5 w-5 text-pink-500" />,
  [FileType.AUDIO]: <Music className="h-5 w-5 text-emerald-500" />,
  [FileType.ARCHIVE]: <Archive className="h-5 w-5 text-orange-500" />,
  [FileType.OTHER]: <File className="h-5 w-5 text-muted-foreground" />,
}

const FILE_BADGE_COLORS: Record<FileType, string> = {
  [FileType.FOLDER]: "bg-amber-500/10 text-amber-600",
  [FileType.DOCUMENT]: "bg-blue-500/10 text-blue-600",
  [FileType.IMAGE]: "bg-purple-500/10 text-purple-600",
  [FileType.VIDEO]: "bg-pink-500/10 text-pink-600",
  [FileType.AUDIO]: "bg-emerald-500/10 text-emerald-600",
  [FileType.ARCHIVE]: "bg-orange-500/10 text-orange-600",
  [FileType.OTHER]: "bg-muted text-muted-foreground",
}

export const VISIBILITY_COLORS: Record<FileVisibility, string> = {
  [FileVisibility.PRIVATE]:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  [FileVisibility.TEAM]: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  [FileVisibility.PUBLIC]:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

export const VISIBILITY_ICONS: Record<FileVisibility, React.ReactNode> = {
  [FileVisibility.PRIVATE]: <Lock className="h-3 w-3" />,
  [FileVisibility.TEAM]: <Users className="h-3 w-3" />,
  [FileVisibility.PUBLIC]: <Globe className="h-3 w-3" />,
}

export function getFilesColumns(
  actions: FilesColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<FileItem, any>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("name")} />
      ),
      cell: ({ row }) => {
        const file = row.original
        return (
          <div className="flex min-w-0 items-center gap-3">
            {FILE_ICONS[file.type] || FILE_ICONS[FileType.OTHER]}
            <div className="min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {file.name}
                    </span>
                    {file.starred && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{file.name}</p>
                </TooltipContent>
              </Tooltip>
              {file.projectName && (
                <span className="block truncate text-xs text-muted-foreground">
                  {file.projectName}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "type",
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("type")} />
      ),
      cell: ({ row }) => {
        const file = row.original
        return (
          <Badge variant="outline" className={FILE_BADGE_COLORS[file.type]}>
            {t(file.type.toLowerCase())}
          </Badge>
        )
      },
    },
    {
      id: "size",
      accessorKey: "size",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("size")} />
      ),
      cell: ({ row }) => {
        const file = row.original
        if (file.type === FileType.FOLDER) {
          return <span className="text-sm text-muted-foreground">--</span>
        }
        return (
          <span className="text-sm tabular-nums">
            {formatFileSize(file.size)}
          </span>
        )
      },
    },
    {
      id: "visibility",
      accessorKey: "visibility",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("visibility")} />
      ),
      cell: ({ row }) => {
        const file = row.original
        return (
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${VISIBILITY_COLORS[file.visibility]}`}
          >
            {VISIBILITY_ICONS[file.visibility]}
            {t(file.visibility.toLowerCase())}
          </Badge>
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
        const file = row.original
        return (
          <div className="flex items-center gap-2">
            <SpaceAvatar
              name={file.owner.name}
              src={file.owner.avatar || ""}
              size="sm"
            />
            <div>
              <p className="text-sm">{file.owner.name}</p>
              <span className="text-xs text-muted-foreground">
                {file.owner.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: "modified",
      accessorKey: "modifiedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("modified")} />
      ),
      cell: ({ row }) => {
        const date = row.original.modifiedAt
        const now = new Date()
        const modified = new Date(date)
        const diffMs = now.getTime() - modified.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffHr = Math.floor(diffMs / 3600000)
        const diffDay = Math.floor(diffMs / 86400000)

        let timeAgo
        if (diffMin < 1) timeAgo = t("justNow")
        else if (diffMin < 60) timeAgo = t("minutesAgo", { count: diffMin })
        else if (diffHr < 24) timeAgo = t("hoursAgo", { count: diffHr })
        else if (diffDay < 7) timeAgo = t("daysAgo", { count: diffDay })
        else timeAgo = modified.toLocaleDateString()

        return <span className="text-sm">{timeAgo}</span>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const file = row.original
        const rowActions: RowAction<FileItem>[] = []

        // Preview (for images)
        if (actions.onPreview && file.type === FileType.IMAGE) {
          rowActions.push({
            label: t("preview"),
            icon: FileUp,
            onClick: actions.onPreview,
          })
        }

        // Download
        rowActions.push({
          label: t("download"),
          icon: Download,
          onClick: actions.onDownload,
        })

        // Star
        rowActions.push({
          label: file.starred ? t("unstar") : t("star"),
          icon: Star,
          onClick: actions.onStar,
          variant: file.starred ? "default" : "default",
        })

        // Details
        if (actions.onDetails) {
          rowActions.push({
            label: t("details"),
            icon: Info,
            separatorBefore: true,
            onClick: actions.onDetails,
          })
        }

        // Copy
        if (actions.onCopy) {
          rowActions.push({
            label: t("copy"),
            icon: Copy,
            onClick: actions.onCopy,
          })
        }

        // Duplicate
        if (actions.onDuplicate) {
          rowActions.push({
            label: t("duplicate"),
            icon: FileUp,
            onClick: actions.onDuplicate,
          })
        }

        // Rename
        rowActions.push({
          label: t("rename"),
          icon: Pencil,
          separatorBefore: true,
          onClick: actions.onRename,
        })

        // Share
        rowActions.push({
          label: t("share"),
          icon: Share2,
          onClick: actions.onShare,
        })

        // Change Visibility
        if (actions.onChangeVisibility) {
          rowActions.push({
            label: t("changeVisibility"),
            icon: Globe,
            onClick: () => {
              // Toggle visibility or show menu
              const visibilities = Object.values(FileVisibility)
              const currentIndex = visibilities.indexOf(file.visibility)
              const nextIndex = (currentIndex + 1) % visibilities.length
              actions.onChangeVisibility?.(file, visibilities[nextIndex])
            },
          })
        }

        // Delete
        rowActions.push({
          label: t("delete"),
          icon: Trash2,
          variant: "destructive",
          separatorBefore: true,
          onClick: actions.onDelete,
        })

        return <DataTableRowActions row={file} actions={rowActions} />
      },
    },
  ]
}
