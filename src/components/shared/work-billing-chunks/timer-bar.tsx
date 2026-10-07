"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, X } from "@/components/ui/carbon/icons"
import { useTimer, useTimerMutations } from "@/hooks/workforce/use-work-billing"
import type { WorkProject, WorkTask } from "@/types/work-projects"

const NO_TASK = "__none__"

function elapsed(startedAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000))
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

/** Start/stop timer on a project and task; one runs per person (TIM-2). */
export function TimerBar({ employeeId, projects, tasks }: { employeeId: string; projects: WorkProject[]; tasks: WorkTask[] }) {
  const t = useTranslations()
  const { data: running } = useTimer(employeeId)
  const { start, stop, discard } = useTimerMutations(employeeId)
  const [projectId, setProjectId] = useState("")
  const [taskId, setTaskId] = useState(NO_TASK)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [running])

  if (running) {
    const project = projects.find((p) => p.id === running.projectId)
    const task = tasks.find((x) => x.id === running.taskId)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-info-soft px-4 py-3" role="status">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-medium">{project?.code} · {project?.name}</span>
          {task && <span className="text-muted-foreground"> · {task.title}</span>}
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums" aria-label={t("timerRunningFor")}>{elapsed(running.startedAt, now)}</span>
        <Button size="sm" onClick={() => stop.mutate()} disabled={stop.isPending}>
          <Square className="size-4" /> {t("stopAndLog")}
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t("discardTimer")} onClick={() => discard.mutate()}>
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  const projectTasks = tasks.filter((x) => x.projectId === projectId)
  // Time is logged on projects the person belongs to: say so instead of showing an empty list
  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-card p-4 sm:flex-row sm:items-center">
        <span className="text-sm font-medium sm:me-1">{t("timer")}</span>
        <p className="flex-1 text-sm text-muted-foreground">{t("timerNoProjects")}</p>
        <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects">{t("timerOpenProjects")}</Link></Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <span className="text-sm font-medium sm:me-1">{t("timer")}</span>
      <div className="sm:w-64">
      <Select value={projectId} onValueChange={(v) => { setProjectId(v); setTaskId(NO_TASK) }}>
        <SelectTrigger className="w-full bg-card" aria-label={t("project")}>
          <SelectValue placeholder={t("chooseProject")}>{projects.find((p) => p.id === projectId)?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      </div>
      <div className="sm:w-56">
      <Select value={taskId} onValueChange={setTaskId}>
        <SelectTrigger className="w-full bg-card" aria-label={t("task")} disabled={!projectId}>
          <SelectValue>{taskId === NO_TASK ? t("noSpecificTask") : tasks.find((x) => x.id === taskId)?.title}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TASK}>{t("noSpecificTask")}</SelectItem>
          {projectTasks.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}
        </SelectContent>
      </Select>
      </div>
      <Button
        variant="outline"
        disabled={!projectId || start.isPending}
        onClick={() => start.mutate({ projectId, taskId: taskId === NO_TASK ? undefined : taskId })}
      >
        <Play className="size-4" /> {t("startTimer")}
      </Button>
    </div>
  )
}
