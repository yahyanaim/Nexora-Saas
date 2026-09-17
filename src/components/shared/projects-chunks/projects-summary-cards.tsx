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
import {
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardCheck,
  Clock,
  FolderArchive,
  Plus,
} from "@/components/ui/carbon/icons"
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

    const total = projects.length
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
