"use client"

import { useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  X,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileType,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NO_PROJECT_VALUE = "none"

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], projectId?: string) => void
  isUploading: boolean
  uploadProgress?: Record<string, number>
  projects?: { id: string; name: string }[]
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
  isUploading,
  uploadProgress = {},
  projects = [],
}: FileUploadDialogProps) {
  const t = useTranslations()
  const [files, setFiles] = useState<File[]>([])
  const [selectedProject, setSelectedProject] =
    useState<string>(NO_PROJECT_VALUE)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (file: File) => {
    const mime = file.type
    const className = "h-8 w-8"
    if (mime.startsWith("image/")) return <FileImage className={className} />
    if (mime.startsWith("video/")) return <FileVideo className={className} />
    if (mime.startsWith("audio/")) return <FileAudio className={className} />
    if (mime.includes("pdf")) return <FileText className={className} />
    if (
      mime.includes("excel") ||
      mime.includes("sheet") ||
      mime.includes("csv")
    )
      return <FileSpreadsheet className={className} />
    if (
      mime.includes("html") ||
      mime.includes("javascript") ||
      mime.includes("json")
    )
      return <FileCode className={className} />
    if (mime.includes("word") || mime.includes("document"))
      return <FileType className={className} />
    return <File className={className} />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      setFiles((prev) => [...prev, ...selectedFiles])
    },
    []
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(() => {
    if (files.length === 0) return
    const projectId =
      selectedProject === NO_PROJECT_VALUE ? undefined : selectedProject
    onUpload(files, projectId)
  }, [files, selectedProject, onUpload])

  const resetDialog = useCallback(() => {
    setFiles([])
    setSelectedProject(NO_PROJECT_VALUE)
    setIsDragging(false)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetDialog()
      }
      onOpenChange(open)
    },
    [onOpenChange, resetDialog]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("uploadFiles")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 px-4 py-3">
          {/* Project Selection */}
          {projects.length > 0 && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full py-6">
                <SelectValue placeholder={t("selectProject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>
                  {t("noProject")}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              files.length > 0 && "border-emerald-500/50 bg-emerald-500/5"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm">
              {isDragging ? t("dropFilesHere") : t("dragDropFiles")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("orClickToBrowse")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("supportedFiles")}
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("selectedFiles")} ({files.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  className="text-destructive hover:text-destructive"
                >
                  {t("clearAll")}
                </Button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {files.map((file, index) => {
                  const progress = uploadProgress[file.name] || 0
                  const isComplete = progress >= 100
                  const isError = uploadProgress[`${file.name}_error`] === 1

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        isComplete
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : isError
                            ? "border-destructive/30 bg-destructive/5"
                            : "bg-muted/30"
                      )}
                    >
                      {getFileIcon(file)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        {isUploading && (
                          <Progress value={progress} className="mt-1 h-1.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isUploading && progress > 0 && progress < 100 && (
                          <span className="text-xs font-medium">
                            {Math.round(progress)}%
                          </span>
                        )}
                        {isComplete && (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        {isError && (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                        {!isUploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="rounded-md p-1 transition-colors hover:bg-muted"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            className="flex-1"
            variant="destructive"
            onClick={() => handleOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="flex-1"
            variant={"primary"}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t("upload")} ({files.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
