"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Bookmark, CalendarDays, CheckCircle2, FileText, ListChecks, Pencil, Plus, Trash2, Users } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProjectPageMutations, useProjectPages } from "@/hooks/workforce/use-project-pages"
import { useTaskMutations } from "@/hooks/workforce/use-work-projects"
import { findMentions } from "@/lib/api/task-collab-api"
import { actionItems, actionTitle, linkActionToTask, pageTemplate } from "@/lib/workforce/project-pages"
import { todayIso } from "@/lib/workforce/project-metrics"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { Priority, TaskStatus, type ProjectPage } from "@/types/work-projects"
import type { Employee } from "@/types/workforce"
import { RichText, RichTextEditor, type KeyResolver } from "./rich-text"

type Draft = { id?: string; kind: ProjectPage["kind"]; title: string; body: string; meetingDate: string; attendeeIds: string[] }

/**
 * The Pages tab of a project (P5): a small wiki and meeting notes. Action
 * items ("- [ ] …" lines) can each become a task; the line then links to it.
 */
export function ProjectPagesPanel({ projectId, projectCode, team, canEdit, resolveKey }: { projectId: string; projectCode: string; team: Employee[]; canEdit: boolean; resolveKey?: KeyResolver }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: pages = [], isLoading } = useProjectPages(projectId)
  const { save, setBody, pin, remove } = useProjectPageMutations(projectId)
  const { create: createTask } = useTaskMutations()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [deleting, setDeleting] = React.useState<ProjectPage | null>(null)
  const [making, setMaking] = React.useState<number | null>(null)
  const page = pages.find((p) => p.id === selectedId) ?? (draft ? undefined : pages[0])
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso.length > 10 ? iso : `${iso}T00:00:00`))
  const nameOf = (id: string) => team.find((e) => e.id === id)?.name ?? "—"

  const start = (kind: ProjectPage["kind"]) =>
    setDraft({ kind, title: "", body: pageTemplate(kind, { agenda: t("pgAgenda"), notes: t("pgNotes"), actions: t("pgActions") }), meetingDate: todayIso(), attendeeIds: [] })
  const edit = (p: ProjectPage) => setDraft({ id: p.id, kind: p.kind, title: p.title, body: p.body, meetingDate: p.meetingDate ?? todayIso(), attendeeIds: p.attendeeIds ?? [] })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    save.mutate(
      { id: draft.id, input: { projectId, kind: draft.kind, title: draft.title, body: draft.body, meetingDate: draft.kind === "meeting" ? draft.meetingDate : undefined, attendeeIds: draft.attendeeIds } },
      {
        onSuccess: (saved) => {
          setSelectedId(saved.id)
          setDraft(null)
        },
      }
    )
  }

  // an action item becomes a task: the person @mentioned on the line gets it when on the team
  const makeTask = async (p: ProjectPage, line: number, text: string) => {
    setMaking(line)
    try {
      const [personId] = findMentions(text, team)
      const person = team.find((e) => e.id === personId)
      const task = await createTask.mutateAsync({ projectId, title: actionTitle(text, person?.name) || text, status: TaskStatus.TODO, priority: Priority.MEDIUM, estimatedHours: 0, subtasks: [], assigneeId: person?.id })
      const key = `${projectCode}#${task.number}`
      await setBody.mutateAsync({ id: p.id, body: linkActionToTask(p.body, line, key) })
      toast.success(t("pgTaskMade", { key }))
    } catch {
      // the mutations already said what went wrong
    } finally {
      setMaking(null)
    }
  }

  const list = (kind: ProjectPage["kind"]) => pages.filter((p) => p.kind === kind)
  const items = page ? actionItems(page.body) : []

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label={t("pgTab")} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel">
        {canEdit && (
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={() => start("page")}><Plus className="size-4" />{t("pgNewPage")}</Button>
            <Button size="sm" variant="outline" onClick={() => start("meeting")}><CalendarDays className="size-4" />{t("pgNewMeeting")}</Button>
          </div>
        )}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          (["page", "meeting"] as const).map((kind) => (
            <div key={kind}>
              <h3 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(kind === "page" ? "pgPages" : "pgMeetings")}</h3>
              {list(kind).length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{t("pgNone")}</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {list(kind).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-current={page?.id === p.id && !draft ? "page" : undefined}
                        onClick={() => {
                          setDraft(null)
                          setSelectedId(p.id)
                        }}
                        className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", page?.id === p.id && !draft && "bg-primary/10 font-medium text-primary")}
                      >
                        {kind === "page" ? <FileText className="size-4 shrink-0" aria-hidden /> : <CalendarDays className="size-4 shrink-0" aria-hidden />}
                        <span className="min-w-0 flex-1 truncate">{p.title}</span>
                        {p.pinned && <Bookmark className="size-3.5 shrink-0 text-muted-foreground" aria-label={t("pgPinned")} />}
                      </button>
                      {kind === "meeting" && p.meetingDate && <p className="ps-8 text-[11px] text-muted-foreground">{date(p.meetingDate)}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </nav>

      <section className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-6" aria-live="polite">
        {draft ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t(draft.id ? "pgEdit" : draft.kind === "meeting" ? "pgNewMeeting" : "pgNewPage")}</h2>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pg-title">{t("pgTitle")}</Label>
              <Input id="pg-title" value={draft.title} maxLength={120} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t(draft.kind === "meeting" ? "pgMeetingPlaceholder" : "pgTitlePlaceholder")} />
            </div>
            {draft.kind === "meeting" && (
              <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pg-date">{t("pgDate")}</Label>
                  <Input id="pg-date" type="date" value={draft.meetingDate} onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })} />
                </div>
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium">{t("pgAttendees")}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {team.map((e) => {
                      const on = draft.attendeeIds.includes(e.id)
                      return (
                        <button key={e.id} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, attendeeIds: on ? draft.attendeeIds.filter((x) => x !== e.id) : [...draft.attendeeIds, e.id] })} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                          {e.name}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            )}
            <RichTextEditor id="pg-body" label={t("pgBody")} value={draft.body} onChange={(body) => setDraft({ ...draft, body })} resolve={resolveKey} placeholder={t("pgBodyPlaceholder")} hint={t("pgBodyHint")} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>{t("cancel")}</Button>
              <Button type="submit" variant="primary" disabled={!draft.title.trim() || save.isPending}>{t("save")}</Button>
            </div>
          </form>
        ) : !page ? (
          <EmptyState icon={FileText} title={t("pgEmpty")} hint={t("pgEmptyHint")} />
        ) : (
          <article className="flex flex-col gap-4">
            <header className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{page.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {page.kind === "meeting" && page.meetingDate ? `${date(page.meetingDate)} · ` : ""}
                  {t("pgUpdated", { name: page.updatedBy, date: date(page.updatedAt) })}
                </p>
                {page.kind === "meeting" && (page.attendeeIds?.length ?? 0) > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" aria-hidden /><span className="sr-only">{t("pgAttendees")}: </span>{page.attendeeIds!.map(nameOf).join(", ")}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-pressed={!!page.pinned} onClick={() => pin.mutate({ id: page.id, pinned: !page.pinned })}><Bookmark className="size-4" />{t(page.pinned ? "pgUnpin" : "pgPin")}</Button>
                  <Button size="sm" variant="outline" onClick={() => edit(page)}><Pencil className="size-4" />{t("edit")}</Button>
                  <Button size="icon" variant="ghost" className="size-9 text-muted-foreground hover:text-destructive" aria-label={t("pgDelete", { name: page.title })} onClick={() => setDeleting(page)}><Trash2 className="size-4" /></Button>
                </div>
              )}
            </header>
            {page.body.trim() ? <RichText source={page.body} resolve={resolveKey} /> : <p className="text-sm text-muted-foreground">{t("rtEmpty")}</p>}
            {items.length > 0 && (
              <section aria-labelledby="pg-actions" className="rounded-2xl border border-border p-3">
                <h3 id="pg-actions" className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4" aria-hidden />{t("pgActionsTitle", { n: items.filter((i) => !i.key && !i.done).length })}</h3>
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li key={item.line} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className={cn("min-w-0 flex-1", item.done && "text-muted-foreground line-through")}>{item.text}</span>
                      {item.key ? (
                        <span className="flex items-center gap-1 text-xs text-success-foreground"><CheckCircle2 className="size-3.5" aria-hidden />{t("pgIsTask", { key: item.key })}</span>
                      ) : canEdit && !item.done ? (
                        <Button size="sm" variant="outline" disabled={making !== null} onClick={() => void makeTask(page, item.line, item.text)} aria-label={t("pgMakeTaskOf", { text: item.text })}>
                          <Plus className="size-4" />
                          {t("pgMakeTask")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </section>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("pgDeleteTitle")}
        description={t("pgDeleteConfirm", { name: deleting?.title ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
              setSelectedId(null)
            },
          })
        }
      />
    </div>
  )
}
