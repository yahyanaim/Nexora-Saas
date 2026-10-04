"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Trash2 } from "@/components/ui/carbon/icons"
import { useTaskActivity, useTaskCommentMutations, useTaskComments } from "@/hooks/workforce/use-task-collab"
import type { Employee } from "@/types/workforce"
import type { TaskActivity, TaskStatus } from "@/types/work-projects"
import type { TaskLabel } from "@/types/work-settings"
import { TASK_STATUS_LABEL } from "./project-labels"

interface Props {
  taskId: string
  team: Employee[]
  labels: TaskLabel[]
}

const when = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/** Comments with @mentions and the task's change history (PRJ-7). */
export function TaskDiscussion({ taskId, team, labels }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: comments = [] } = useTaskComments(taskId)
  const { data: activity = [] } = useTaskActivity(taskId)
  const { add, remove } = useTaskCommentMutations(taskId)
  const [body, setBody] = useState("")
  const name = (id?: string) => team.find((e) => e.id === id)?.name ?? (id ? "—" : t("unassigned"))

  const describe = (a: TaskActivity) => {
    switch (a.kind) {
      case "created":
        return t("activityCreated")
      case "status":
        return t("activityStatus", { from: t(TASK_STATUS_LABEL[a.from as TaskStatus]), to: t(TASK_STATUS_LABEL[a.to as TaskStatus]) })
      case "assignee":
        return t("activityAssignee", { to: name(a.to) })
      case "due":
        return t("activityDue", { to: a.to ?? "—" })
      case "estimate":
        return t("activityEstimate", { from: a.from ?? "0", to: a.to ?? "0" })
      case "title":
        return t("activityTitle", { to: a.to ?? "" })
      case "labels":
        return t("activityLabels", {
          to: (a.to ? a.to.split(",") : []).map((id) => labels.find((l) => l.id === id)?.name ?? id).join(", ") || "—",
        })
    }
  }

  // Highlight @mentions of team members in a comment
  const render = (text: string) => {
    const names = team.map((e) => e.name).sort((a, b) => b.length - a.length)
    if (names.length === 0) return text
    const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "gi")
    return text.split(pattern).map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="rounded bg-info-soft px-1 font-medium text-info-foreground">{part}</span>
      ) : (
        part
      )
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t("comments")}</h3>
        {comments.length === 0 && <p className="text-sm text-muted-foreground">{t("noCommentsYet")}</p>}
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <SpaceAvatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {when(c.createdAt, locale)}
                    <button
                      type="button"
                      aria-label={t("deleteComment")}
                      onClick={() => remove.mutate(c.id)}
                      className="rounded-full p-1 hover:bg-card hover:text-foreground"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{render(c.body)}</p>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate({ body, people: team }, { onSuccess: () => setBody("") })
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("commentPlaceholder")}
            aria-label={t("addComment")}
            rows={2}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{t("mentionHint")}</span>
            <Button type="submit" size="sm" disabled={!body.trim() || add.isPending}>
              {t("comment")}
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("history")}</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHistoryYet")}</p>
        ) : (
          <ol className="flex flex-col gap-2 border-s border-border ps-4">
            {activity.map((a) => (
              <li key={a.id} className="relative text-sm">
                <span className="absolute -start-[1.3rem] top-1.5 size-2 rounded-full bg-border" aria-hidden />
                <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{describe(a)}</span>
                <span className="block text-xs text-muted-foreground">{when(a.createdAt, locale)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
