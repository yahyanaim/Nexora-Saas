// components/files/files-summary-cards.tsx

"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { File, FileText, Image, Video, Archive, Upload } from "lucide-react"
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
      <div className="p-3">
        <Carousel className="w-full">
          <CarouselContent>
            {[1, 2, 3, 4].map((i) => (
              <CarouselItem
                key={i}
                className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="mt-2 h-8 w-16 rounded bg-muted" />
                  </CardHeader>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
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
    <div className="p-3">
      <Carousel className="w-full">
        <CarouselContent>
          {cards.map((card) => (
            <CarouselItem
              key={card.key}
              className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <div className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle
                      className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${card.valueClassName}`}
                    >
                      {card.value}
                    </CardTitle>
                    <CardAction>
                      <Badge
                        variant={card.badge.variant}
                        className={card.badge.className}
                      >
                        <card.badge.icon className="size-3" />
                        {card.badge.label}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="h-full flex-col items-start gap-1.5 text-sm">
                    <div
                      className={`line-clamp-1 flex gap-2 font-medium ${card.footer.className}`}
                    >
                      <card.footer.icon className="size-4" />
                      {card.footer.text}
                    </div>
                    {/* <div className="text-muted-foreground">{card.footer.subtext}</div> */}
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  )
}
