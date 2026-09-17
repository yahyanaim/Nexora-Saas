// components/files/files-summary-cards.tsx

"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { File, FileText, Image, Video, Archive, Upload } from "@/components/ui/carbon/icons"
import { FileItem, FileType, FileSummary } from "@/types/files"

interface FilesSummaryCardsProps {
  files?: FileItem[]
  summary?: FileSummary
  isLoading?: boolean
  useApi?: boolean
}

export function FilesSummaryCards({
  files,
  summary: apiSummary,
  isLoading = false,
  useApi = true,
}: FilesSummaryCardsProps) {
  const t = useTranslations()

  const localSummary = useMemo(() => {
    if (!files || files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        documents: 0,
        images: 0,
        videos: 0,
        archives: 0,
        others: 0,
      }
    }

    let totalFiles = 0
    let totalSize = 0
    let documents = 0
    let images = 0
    let videos = 0
    let archives = 0
    let others = 0

    files.forEach((file) => {
      if (file.type === FileType.FOLDER) return
      totalFiles += 1
      totalSize += file.size

      switch (file.type) {
        case FileType.DOCUMENT:
          documents += 1
          break
        case FileType.IMAGE:
          images += 1
          break
        case FileType.VIDEO:
          videos += 1
          break
        case FileType.ARCHIVE:
          archives += 1
          break
        default:
          others += 1
          break
      }
    })

    return {
      totalFiles,
      totalSize,
      documents,
      images,
      videos,
      archives,
      others,
    }
  }, [files])

  const summary = useApi ? apiSummary : localSummary

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse h-full flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </CardHeader>
            <CardFooter className="px-5 py-3 pt-0 border-t-0 mt-auto">
              <div className="h-3 w-32 rounded bg-muted" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t("noDataAvailable")}
      </div>
    )
  }

  const cards = [
    {
      key: "total",
      title: t("totalFiles"),
      value: summary.totalFiles.toString(),
      valueClassName: "",
      badge: {
        label: formatFileSize(summary.totalSize),
        icon: File,
        variant: "outline" as const,
        className: "gap-1",
      },
      footer: {
        icon: Upload,
        text: t("totalFilesDescription"),
        subtext: t("totalFilesSubtext"),
        className: "",
      },
    },
    {
      key: "documents",
      title: t("documents"),
      value: summary.documents.toString(),
      valueClassName: "text-blue-600",
      badge: {
        label: t("documents"),
        icon: FileText,
        variant: "outline" as const,
        className: "gap-1 border-blue-500/20 bg-blue-500/10 text-blue-600",
      },
      footer: {
        icon: FileText,
        text: t("documentsDescription"),
        subtext: t("documentsSubtext"),
        className: "text-blue-600",
      },
    },
    {
      key: "images",
      title: t("images"),
      value: summary.images.toString(),
      valueClassName: "text-purple-600",
      badge: {
        label: t("images"),
        icon: Image,
        variant: "outline" as const,
        className:
          "gap-1 border-purple-500/20 bg-purple-500/10 text-purple-600",
      },
      footer: {
        icon: Image,
        text: t("imagesDescription"),
        subtext: t("imagesSubtext"),
        className: "text-purple-600",
      },
    },
    {
      key: "media",
      title: t("mediaArchives"),
      value: (summary.videos + summary.archives).toString(),
      valueClassName: "text-orange-600",
      badge: {
        label: t("media"),
        icon: Video,
        variant: "outline" as const,
        className:
          "gap-1 border-orange-500/20 bg-orange-500/10 text-orange-600",
      },
      footer: {
        icon: Archive,
        text: t("mediaDescription"),
        subtext: t("mediaSubtext"),
        className: "text-orange-600",
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {cards.map((card) => (
        <Card key={card.key} className="h-full flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">{card.title}</CardDescription>
              <Badge
                variant={card.badge.variant}
                className={card.badge.className}
              >
                <card.badge.icon className="size-3" />
                {card.badge.label}
              </Badge>
            </div>
            <CardTitle
              className={`text-2xl font-bold font-mono tabular-nums @[250px]/card:text-3xl mt-2 ${card.valueClassName}`}
            >
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="px-5 py-3 pt-0 border-t-0 flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
            <card.footer.icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{card.footer.text}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
