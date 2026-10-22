"use client"

import { useTranslations } from "next-intl"
import { Bug, ChevronDown, ChevronUpIcon, ChevronsUp, EqualIcon, PenTool, Sparkles, SquareCheck } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { Priority, type WorkTask } from "@/types/work-projects"
import type { TaskLabel } from "@/types/work-settings"
import { PRIORITY_LABEL } from "./project-labels"

/**
 * Small, consistent marks for tasks across the board, lists, spreadsheet,
 * calendar and gantt: a priority arrow and a type square, both from the
 * design system's tones.
 */

const PRIORITY_MARK: Record<Priority, { Icon: typeof ChevronsUp; className: string }> = {
  [Priority.URGENT]: { Icon: ChevronsUp, className: "text-destructive" },
  [Priority.HIGH]: { Icon: ChevronUpIcon, className: "text-destructive" },
  [Priority.MEDIUM]: { Icon: EqualIcon, className: "text-warning-foreground" },
  [Priority.LOW]: { Icon: ChevronDown, className: "text-primary" },
}

/** Jira-style priority arrow; with `label` it also shows the word. */
export function PriorityMark({ priority, label = false, className }: { priority: Priority; label?: boolean; className?: string }) {
  const t = useTranslations()
  const { Icon, className: tone } = PRIORITY_MARK[priority]
  const text = t(PRIORITY_LABEL[priority])
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)} title={label ? undefined : text}>
      <Icon className={cn("size-4 shrink-0", tone)} strokeWidth={2.25} aria-hidden />
      {label ? <span>{text}</span> : <span className="sr-only">{text}</span>}
    </span>
  )
}

type Kind = "bug" | "feature" | "design" | "task"

const KIND: Record<Kind, { Icon: typeof Bug; className: string }> = {
  bug: { Icon: Bug, className: "bg-danger-soft text-danger-foreground" },
  feature: { Icon: Sparkles, className: "bg-success-soft text-success-foreground" },
  design: { Icon: PenTool, className: "bg-warning-soft text-warning-foreground" },
  task: { Icon: SquareCheck, className: "bg-info-soft text-info-foreground" },
}

/** The kind of work a task is, read from its labels (bug, feature, design), else a plain task. */
function kindOf(task: Pick<WorkTask, "labelIds">, labels: TaskLabel[]): { kind: Kind; name?: string } {
  for (const kind of ["bug", "feature", "design"] as const) {
    const label = labels.find((l) => (task.labelIds ?? []).includes(l.id) && (l.id.includes(kind) || l.name.toLowerCase().includes(kind)))
    if (label) return { kind, name: label.name }
  }
  return { kind: "task" }
}

/** A small rounded square that tells the type of a task at a glance. */
export function TaskTypeMark({ task, labels, className }: { task: Pick<WorkTask, "labelIds">; labels: TaskLabel[]; className?: string }) {
  const t = useTranslations()
  const { kind, name } = kindOf(task, labels)
  const { Icon, className: tone } = KIND[kind]
  const text = name ?? t("task")
  return (
    <span className={cn("inline-grid size-5 shrink-0 place-items-center rounded-md", tone, className)} title={text}>
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  )
}
