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
import {
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardCheck,
  Clock,
  FolderArchive,
  Plus,
  Loader2,
} from "lucide-react"
import { Project, ProjectStatus } from "@/types/projects"
import { useProjectsSummary } from "@/hooks/projects/use-projects-summary"

interface ProjectsSummaryCardsProps {
  projects?: Project[]
  useApi?: boolean
}

export function ProjectsSummaryCards({
  projects,
  useApi = true,
}: ProjectsSummaryCardsProps) {
  const t = useTranslations()

  const { summary: apiSummary, isLoading, isError } = useProjectsSummary()

  const localSummary = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        total: 0,
        active: 0,
        archived: 0,
        completed: 0,
        onHold: 0,
        totalMembers: 0,
        totalTasks: 0,
        completedTasks: 0,
        avgProgress: 0,
      }
    }

    let total = projects.length
    let active = 0
    let archived = 0
    let completed = 0
    let onHold = 0
    let totalMembers = 0
    let totalTasks = 0
    let completedTasks = 0
    let totalProgress = 0

    projects.forEach((project) => {
      if (project.status === ProjectStatus.ACTIVE) active += 1
      else if (project.status === ProjectStatus.ARCHIVED) archived += 1
      else if (project.status === ProjectStatus.COMPLETED) completed += 1
      else if (project.status === ProjectStatus.ON_HOLD) onHold += 1

      totalMembers += project.members?.length || 0
      totalTasks += project.tasks?.length || 0
      completedTasks +=
        project.tasks?.filter((t) => t.status === "done").length || 0
      totalProgress += project.progress || 0
    })

    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0

    return {
      total,
      active,
      archived,
      completed,
      onHold,
      totalMembers,
      totalTasks,
      completedTasks,
      avgProgress,
    }
  }, [projects])

  const summary = useApi ? apiSummary : localSummary

  if (isLoading && useApi) {
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

  if (isError && useApi) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("failedToLoadSummary")}
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
      title: t("totalProjects"),
      value: summary.total.toString(),
      valueClassName: "",
      badge: {
        label: `${summary.avgProgress}% ${t("avgProgress")}`,
        icon: TrendingUp,
        variant: "outline" as const,
        className: "gap-1",
      },
      footer: {
        icon: Plus,
        text: t("totalProjectsDescription"),
        subtext: t("totalProjectsSubtext", { members: summary.totalMembers }),
        className: "",
      },
    },
    {
      key: "active",
      title: t("activeProjects"),
      value: summary.active.toString(),
      valueClassName: "text-emerald-600",
      badge: {
        label: t("active"),
        icon: Users,
        variant: "outline" as const,
        className:
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      },
      footer: {
        icon: Clock,
        text: t("activeProjectsDescription"),
        subtext: t("activeProjectsSubtext"),
        className: "text-emerald-600",
      },
    },
    {
      key: "completed",
      title: t("completedProjects"),
      value: (summary.completed + summary.archived).toString(),
      valueClassName: "text-blue-600",
      badge: {
        label: t("completed"),
        icon: ClipboardCheck,
        variant: "outline" as const,
        className: "gap-1 border-blue-500/20 bg-blue-500/10 text-blue-600",
      },
      footer: {
        icon: ClipboardCheck,
        text: t("completedTasksDescription"),
        subtext: t("completedTasksSubtext", {
          tasks: summary.completedTasks,
          total: summary.totalTasks,
        }),
        className: "text-blue-600",
      },
    },
    {
      key: "onHold",
      title: t("onHoldProjects"),
      value: (summary.onHold + summary.archived).toString(),
      valueClassName: "text-amber-600",
      badge: {
        label: t("onHold"),
        icon: FolderArchive,
        variant: "outline" as const,
        className: "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600",
      },
      footer: {
        icon: TrendingDown,
        text: t("onHoldProjectsDescription"),
        subtext: t("onHoldProjectsSubtext"),
        className: "text-amber-600",
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
