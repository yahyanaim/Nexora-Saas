"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileItem, FileVisibility, FileType } from "@/types/files"
import { useTranslations } from "next-intl"
import {
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  AlertCircle,
} from "lucide-react"
import { VISIBILITY_COLORS, VISIBILITY_ICONS } from "./files-columns"

interface FileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  mode: "rename" | "move" | "details" | "visibility" | "share" | "preview"
  onConfirm?: (file: FileItem, data: any) => void
  onDownload?: (file: FileItem) => void
}

// Helper: Get file icon based on type
const getFileIcon = (type: FileType) => {
  switch (type) {
    case FileType.IMAGE:
      return <ImageIcon className="h-16 w-16 text-purple-500" />
    case FileType.VIDEO:
      return <Video className="h-16 w-16 text-pink-500" />
    case FileType.AUDIO:
      return <Music className="h-16 w-16 text-emerald-500" />
    case FileType.DOCUMENT:
      return <FileText className="h-16 w-16 text-blue-500" />
    default:
      return <File className="h-16 w-16 text-muted-foreground" />
  }
}

// Helper: Get file type label
const getFileTypeLabel = (type: FileType) => {
  switch (type) {
    case FileType.IMAGE:
      return "Image"
    case FileType.VIDEO:
      return "Video"
    case FileType.AUDIO:
      return "Audio"
    case FileType.DOCUMENT:
      return "Document"
    case FileType.ARCHIVE:
      return "Archive"
    case FileType.FOLDER:
      return "Folder"
    default:
      return "File"
  }
}

export function FileDialog({
  open,
  onOpenChange,
  file,
  mode,
  onConfirm,
  onDownload,
}: FileDialogProps) {
  const t = useTranslations()
  const [newName, setNewName] = useState(file?.name || "")
  const [selectedVisibility, setSelectedVisibility] = useState<FileVisibility>(
    file?.visibility || FileVisibility.PRIVATE
  )
  const [imageError, setImageError] = useState(false)

  if (!file) return null

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const handleConfirm = () => {
    if (mode === "rename") {
      onConfirm?.(file, { name: newName })
    } else if (mode === "visibility") {
      onConfirm?.(file, { visibility: selectedVisibility })
    } else {
      onConfirm?.(file, {})
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file)
    }
  }

  // Render file preview based on type
  const renderFilePreview = () => {
    const isImage = file.type === FileType.IMAGE
    const isVideo = file.type === FileType.VIDEO
    const isAudio = file.type === FileType.AUDIO
    const isDocument = file.type === FileType.DOCUMENT
    const isArchive = file.type === FileType.ARCHIVE
    const isFolder = file.type === FileType.FOLDER

    const fileUrl = file.cloudinaryUrl || `/api/files/${file.id}/stream`

    // Image Preview
    if (isImage) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full overflow-hidden rounded-lg border bg-muted/20">
            {!imageError ? (
              <img
                src={fileUrl}
                alt={file.name}
                className="max-h-[400px] w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex min-h-[200px] w-full flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("imageNotAvailable")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("download")}
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} •{" "}
            {t(getFileTypeLabel(file.type).toLowerCase())}
          </p>
        </div>
      )
    }

    // Video Preview
    if (isVideo) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full overflow-hidden rounded-lg border bg-muted/20">
            <video
              controls
              className="max-h-[400px] w-full"
              poster={file.thumbnail}
              onError={(e) => {
                e.currentTarget.style.display = "none"
                const parent = e.currentTarget.parentElement
                if (parent) {
                  const fallback = document.createElement("div")
                  fallback.className =
                    "flex min-h-[200px] flex-col items-center justify-center p-8 text-center"
                  fallback.innerHTML = `
                    <div class="text-6xl mb-4">🎬</div>
                    <p class="text-sm text-muted-foreground">${t("videoNotAvailable")}</p>
                    <button class="mt-4 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium">${t("download")}</button>
                  `
                  parent.appendChild(fallback)
                  const btn = fallback.querySelector("button")
                  if (btn) btn.onclick = handleDownload
                }
              }}
            >
              <source src={fileUrl} type={file.mimeType || "video/mp4"} />
              {t("videoNotSupported")}
            </video>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} • {t("video")}
          </p>
        </div>
      )
    }

    // Audio Preview
    if (isAudio) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full rounded-lg border bg-muted/20 p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Music className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} • {t("audio")}
                </p>
              </div>
              <audio
                controls
                className="w-full max-w-md"
                onError={handleDownload}
              >
                <source src={fileUrl} type={file.mimeType || "audio/mpeg"} />
                {t("audioNotSupported")}
              </audio>
            </div>
          </div>
        </div>
      )
    }

    // Document Preview (PDF, DOCX, etc.)
    if (isDocument) {
      const isPDF = file.extension?.toLowerCase() === "pdf"

      if (isPDF) {
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full overflow-hidden rounded-lg border bg-muted/20">
              <iframe
                src={`${fileUrl}#toolbar=0`}
                className="h-[400px] w-full"
                title={file.name}
                sandbox="allow-scripts allow-modals"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} • {t("pdf")}
            </p>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center justify-center rounded-lg border bg-muted/20 p-8">
            {getFileIcon(file.type)}
            <p className="mt-4 text-lg font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} •{" "}
              {file.extension?.toUpperCase() || t("document")}
            </p>
            <Button className="mt-4" variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              {t("download")}
            </Button>
          </div>
        </div>
      )
    }

    // Archive Preview
    if (isArchive) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center justify-center rounded-lg border bg-muted/20 p-8">
            <div className="mb-4 text-6xl">📦</div>
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)} •{" "}
              {file.extension?.toUpperCase() || t("archive")}
            </p>
            <Button className="mt-4" variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              {t("download")}
            </Button>
          </div>
        </div>
      )
    }

    // Folder Preview
    if (isFolder) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center justify-center rounded-lg border bg-muted/20 p-8">
            <div className="mb-4 text-6xl">📁</div>
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{t("folder")}</p>
          </div>
        </div>
      )
    }

    // Default / Other
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full flex-col items-center justify-center rounded-lg border bg-muted/20 p-8">
          {getFileIcon(file.type)}
          <p className="mt-4 text-lg font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} •{" "}
            {file.extension?.toUpperCase() || t("file")}
          </p>
          <Button className="mt-4" variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            {t("download")}
          </Button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (mode) {
      case "rename":
        return (
          <div className="space-y-2">
            <Label>{t("fileName")}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("enterNewName")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirm()
                }
              }}
            />
          </div>
        )

      case "visibility":
        return (
          <div className="space-y-2">
            <Label>{t("visibility")}</Label>
            <Select
              value={selectedVisibility}
              onValueChange={(value: FileVisibility) =>
                setSelectedVisibility(value)
              }
            >
              <SelectTrigger className="w-full py-6">
                <SelectValue placeholder={t("selectVisibility")} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FileVisibility).map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${VISIBILITY_COLORS[visibility]} border-transparent`}
                      >
                        <span className="flex items-center gap-1">
                          {VISIBILITY_ICONS[visibility]}
                          {t(visibility.toLowerCase())}
                        </span>
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case "details":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("name")}</Label>
              <p className="font-medium">{file.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("type")}</Label>
              <p className="font-medium capitalize">
                {t(getFileTypeLabel(file.type).toLowerCase())}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("size")}</Label>
              <p className="font-medium">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("visibility")}</Label>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={`${VISIBILITY_COLORS[file.visibility]} border-transparent`}
                >
                  <span className="flex items-center gap-1">
                    {VISIBILITY_ICONS[file.visibility]}
                    {t(file.visibility.toLowerCase())}
                  </span>
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("owner")}</Label>
              <p className="font-medium">{file.owner.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("modified")}</Label>
              <p className="font-medium">
                {new Date(file.modifiedAt).toLocaleString()}
              </p>
            </div>
            {file.projectName && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">{t("project")}</Label>
                <p className="font-medium">{file.projectName}</p>
              </div>
            )}
            {file.downloadedCount !== undefined && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">
                  {t("downloads")}
                </Label>
                <p className="font-medium">{file.downloadedCount}</p>
              </div>
            )}
          </div>
        )

      case "share":
        return (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{t("shareLink")}</p>
                <p className="text-xs break-all text-muted-foreground">
                  {`${window.location.origin}/share/${file.id}`}
                </p>
              </div>
            </div>
          </div>
        )

      case "preview":
        return <div className="py-2">{renderFilePreview()}</div>

      default:
        return null
    }
  }

  const getTitle = () => {
    switch (mode) {
      case "rename":
        return t("renameFile")
      case "visibility":
        return t("changeVisibility")
      case "details":
        return t("fileDetails")
      case "share":
        return t("shareFile")
      case "preview":
        return t("previewFile")
      default:
        return ""
    }
  }

  const getDescription = () => {
    switch (mode) {
      case "rename":
        return t("renameFileDescription", { name: file.name })
      case "visibility":
        return t("changeVisibilityDescription", { name: file.name })
      case "details":
        return t("fileDetailsDescription", { name: file.name })
      case "share":
        return t("shareFileDescription", { name: file.name })
      case "preview":
        return t("previewFileDescription", { name: file.name })
      default:
        return ""
    }
  }

  const showFooter = mode !== "details" && mode !== "preview"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="px-4 py-3">{renderContent()}</div>

        {showFooter && (
          <DialogFooter>
            <Button
              className="flex-1"
              variant="destructive"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              variant="primary"
            >
              {mode === "rename" && t("rename")}
              {mode === "visibility" && t("change")}
              {mode === "share" && t("share")}
            </Button>
          </DialogFooter>
        )}

        {mode === "details" && (
          <DialogFooter>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
          </DialogFooter>
        )}

        {mode === "preview" && (
          <DialogFooter>
            <Button
              className="flex-1"
              variant="destructive"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
            <Button
              className="flex-1"
              variant="primary"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("download")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
