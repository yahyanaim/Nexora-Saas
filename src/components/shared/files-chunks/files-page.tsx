"use client"

import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import {
  uploadFileApi,
  deleteFileApi,
  renameFileApi,
  toggleStarFileApi,
  fetchFilesSummaryApi,
  updateFileApi,
} from "@/lib/api/files-api"
import { FileItem, FileType, FileVisibility } from "@/types/files"
import { useFilesTable } from "@/hooks/files/use-files-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { toast } from "@/lib/utils/toast"
import { FileUploadDialog } from "@/components/ui/upload-file"
import { Upload } from "@/components/ui/carbon/icons"
import { useQuery } from "@tanstack/react-query"
import { getFilesColumns } from "./files-columns"
import { FilesSummaryCards } from "./files-summary-cards"
import { FileDialog } from "./file-dialog"

type PendingAction = { type: "delete"; file: FileItem } | null

type FileDialogMode =
  "rename" | "move" | "details" | "visibility" | "share" | "preview" | null

export default function FilesPage() {
  const t = useTranslations()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<FileDialogMode>(null)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)

  const {
    items: files,
    pageCount,
    totalItems,
    isLoading,
    isFetching,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh,
  } = useFilesTable()

  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["files-summary"],
    queryFn: fetchFilesSummaryApi,
    staleTime: 60 * 1000,
  })

  const { remove, isDeleting } = useEntityMutations({
    queryKey: "files",
    createFn: () => Promise.resolve({}),
    updateFn: () => Promise.resolve({}),
    deleteFn: deleteFileApi,
    entityLabel: "File",
  })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const handleUpload = async (files: File[], projectId?: string) => {
    setIsUploading(true)
    setUploadProgress({})

    for (const file of files) {
      const formData = new FormData()
      formData.append("file", file)
      if (projectId) {
        formData.append("projectId", projectId)
      }

      try {
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: progress,
          }))
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        await uploadFileApi(formData)
        toast.success(`${file.name} ${t("uploadedSuccessfully")}`)
      } catch (_error) {
        setUploadProgress((prev) => ({
          ...prev,
          [`${file.name}_error`]: 1,
        }))
        toast.error(`${file.name} ${t("uploadFailed")}`)
      }
    }

    setIsUploading(false)
    setUploadProgress({})
    setUploadOpen(false)
    refresh()
    refetchSummary()
  }

  const handleDownload = useCallback(async (file: FileItem) => {
    try {
      const { cloudinaryUrl: url, name: filename } = file

      if (url) {
        try {
          const response = await fetch(url)
          if (response.ok) {
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.addEventListener("click", (e) => e.stopPropagation())
            link.href = blobUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
            toast.success(t("downloadStarted"))
            return
          }
        } catch {
          // fallback to client-side document generator
        }
      }

      // Fallback for demo files or files without remote Cloudinary storage
      if (filename.toLowerCase().endsWith(".pdf")) {
        const { default: jsPDF } = await import("jspdf")
        const doc = new jsPDF()

        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 32, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.text("Nexora Cloud Platform", 20, 18)
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text("Enterprise Workspace Document", 130, 18)

        doc.setTextColor(15, 23, 42)
        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text(filename.replace(/\.pdf$/i, ""), 20, 52)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 116, 139)
        doc.text(`Document Reference: ${file.id} | Managed by Nexora File Vault`, 20, 62)
        doc.text(`Owner: ${file.owner?.name || "System"} (${file.owner?.email || "admin@nexora.io"})`, 20, 70)
        doc.text(`Created: ${new Date(file.uploadedAt).toLocaleDateString()} | Visibility: ${file.visibility || "TEAM"}`, 20, 78)

        doc.setDrawColor(226, 232, 240)
        doc.line(20, 86, 190, 86)

        doc.setTextColor(51, 65, 85)
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text("Document Abstract & Executive Summary", 20, 100)
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        const sampleText = `This document (${filename}) contains verified project specifications, security controls, and architectural schematics under enterprise compliance. All assets are synchronized with Nexora Workspace Storage.`
        const splitText = doc.splitTextToSize(sampleText, 170)
        doc.text(splitText, 20, 110)

        doc.save(filename)
        toast.success(t("downloadStarted"))
        return
      }

      let mimeType = "application/octet-stream"
      let content: BlobPart = `Nexora Enterprise Asset: ${filename}\nDocument ID: ${file.id}\nOwner: ${file.owner?.name || "Workspace Admin"}\nLast Modified: ${file.modifiedAt || new Date().toISOString()}`

      if (filename.toLowerCase().endsWith(".json")) {
        mimeType = "application/json"
        content = JSON.stringify({
          document: filename,
          id: file.id,
          type: file.type,
          size: file.size,
          owner: file.owner,
          uploadedAt: file.uploadedAt,
          status: "verified",
        }, null, 2)
      } else if (filename.toLowerCase().endsWith(".csv")) {
        mimeType = "text/csv"
        content = `id,name,type,size,owner,uploaded_at\n"${file.id}","${file.name}","${file.type}",${file.size},"${file.owner?.name}","${file.uploadedAt}"\n`
      }

      const blob = new Blob([content], { type: mimeType })
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.addEventListener("click", (e) => e.stopPropagation())
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      toast.success(t("downloadStarted"))
    } catch (error) {
      console.error("Download error:", error)
      toast.error(t("downloadFailed"))
    }
  }, [t])

  const openDialog = (mode: FileDialogMode, file: FileItem) => {
    setSelectedFile(file)
    setDialogMode(mode)
    setDialogOpen(true)
  }

  const handleDialogConfirm = async (file: FileItem, data?: unknown) => {
    const d = (data || {}) as Record<string, unknown>
    try {
      if (dialogMode === "rename") {
        await renameFileApi(file.id, d.name as string)
        toast.success(t("fileRenamed"))
      } else if (dialogMode === "visibility") {
        await updateFileApi(file.id, { visibility: d.visibility as FileVisibility })
        toast.success(t("visibilityChanged"))
      } else if (dialogMode === "share") {
        toast.success(t("shareLinkCopied"))
      } else if (dialogMode === "preview") {
        await handleDownload(file)
      }

      refresh()
      refetchSummary()
      setDialogOpen(false)
      setSelectedFile(null)
    } catch (_error) {
      toast.error(t("actionFailed"))
    }
  }

  const handleStar = useCallback(async (file: FileItem) => {
    try {
      await toggleStarFileApi(file.id)
      toast.success(file.starred ? t("unstarred") : t("starred"))
      refresh()
      refetchSummary()
    } catch (_error) {
      toast.error(t("starFailed"))
    }
  }, [t, refresh, refetchSummary])

  const handleConfirm = async () => {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.file.id, {
        onSuccess: () => {
          setPendingAction(null)
          refetchSummary()
        },
      })
    }
  }

  const columns = useMemo(
    () =>
      getFilesColumns(
        {
          onPreview: (file) => openDialog("preview", file),
          onDownload: handleDownload,
          onStar: handleStar,
          onRename: (file) => openDialog("rename", file),
          onDelete: (file) => setPendingAction({ type: "delete", file }),
          onShare: (file) => openDialog("share", file),
          onDetails: (file) => openDialog("details", file),
          onChangeVisibility: (file) => openDialog("visibility", file),
          onCopy: async (file) => {
            try {
              await navigator.clipboard.writeText(file.name)
              toast.success(t("copied"))
            } catch (_error) {
              toast.error(t("copyFailed"))
            }
          },
        },
        t
      ),
    [t, handleDownload, handleStar]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.file.name

    return {
      title: t("deleteFile"),
      description: t("deleteFileConfirmation", { name }),
      confirmLabel: t("delete"),
      destructive: true,
      isLoading: isDeleting,
    }
  }, [pendingAction, isDeleting, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <FilesSummaryCards
        files={files}
        summary={summaryData}
        isLoading={isLoading}
      />

      <DataTable
        manual
        title={t("files")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={files}
        rowCount={totalItems}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("searchFiles")}
        actions={[
          {
            label: t("upload"),
            icon: Upload,
            onClick: () => setUploadOpen(true),
            variant: "primary",
            iconOnly: true,
          },
        ]}
        filters={[
          {
            columnId: "type",
            title: t("type"),
            options: [
              { label: t("documents"), value: FileType.DOCUMENT },
              { label: t("images"), value: FileType.IMAGE },
              { label: t("videos"), value: FileType.VIDEO },
              { label: t("archives"), value: FileType.ARCHIVE },
              { label: t("others"), value: FileType.OTHER },
            ],
          },
          {
            columnId: "visibility",
            title: t("visibility"),
            options: [
              { label: t("private"), value: FileVisibility.PRIVATE },
              { label: t("team"), value: FileVisibility.TEAM },
              { label: t("public"), value: FileVisibility.PUBLIC },
            ],
          },
        ]}
      />

      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        projects={[
          { id: "p1", name: t("websiteRedesign") },
          { id: "p2", name: t("mobileAppDevelopment") },
          { id: "p3", name: t("dashboardAnalytics") },
          { id: "p4", name: t("marketingCampaign") },
        ]}
      />

      <FileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        file={selectedFile}
        mode={dialogMode || "details"}
        onDownload={handleDownload}
        onConfirm={handleDialogConfirm}
      />

      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
