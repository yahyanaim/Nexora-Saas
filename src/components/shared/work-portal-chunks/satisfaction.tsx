"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "@/components/ui/carbon/icons"
import { useSatisfaction, useSubmitSatisfaction } from "@/hooks/workforce/use-satisfaction"
import { useMilestones, useProjects } from "@/hooks/workforce/use-work-projects"
import { LOW_RATING, pendingSurveys, satisfactionStats, type SurveyAsk } from "@/lib/workforce/satisfaction"
import { cn } from "@/lib/utils"
import type { Milestone, WorkProject } from "@/types/work-projects"
import type { SatisfactionResponse } from "@/types/work-feedback"

/** Read-only stars, e.g. 4 of 5. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40")} />)}
    </span>
  )
}

function SurveyForm({ ask, clientId, viewerName, preview, onDone }: { ask: SurveyAsk; clientId: string; viewerName: string; preview?: boolean; onDone: () => void }) {
  const t = useTranslations()
  const submit = useSubmitSatisfaction()
  const [rating, setRating] = useState(0)
  const [nps, setNps] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const subject = ask.milestone ? t("csatAboutMilestone", { milestone: ask.milestone.title, project: ask.project.name }) : t("csatAboutProject", { project: ask.project.name })
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <p className="text-sm font-medium">{subject}</p>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("csatHowSatisfied")}</Label>
        <div className="flex gap-1" role="radiogroup" aria-label={t("csatHowSatisfied")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}/5`} onClick={() => setRating(n)} className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Star className={cn("size-7", n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{t("csatRecommend")}</Label>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("csatRecommend")}>
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nps === n}
              onClick={() => setNps(n)}
              className={cn("size-9 rounded-lg border border-border text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", nps === n ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>{t("csatUnlikely")}</span><span>{t("csatLikely")}</span></div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`csat-${ask.project.id}-${ask.milestone?.id ?? "p"}`} className="text-xs">{t("csatComment")}</Label>
        <Textarea id={`csat-${ask.project.id}-${ask.milestone?.id ?? "p"}`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button
          disabled={preview || rating === 0 || nps === null || submit.isPending}
          onClick={() => submit.mutate({ clientId, projectId: ask.project.id, milestoneId: ask.milestone?.id, rating, nps: nps ?? 0, comment, respondentName: viewerName }, { onSuccess: onDone })}
        >
          {t("csatSend")}
        </Button>
      </div>
    </li>
  )
}

/** The surveys a client still has to answer, shown at the top of its portal. */
export function SatisfactionSurveys({ clientId, viewerName, projects, milestones, preview }: { clientId: string; viewerName: string; projects: WorkProject[]; milestones: Milestone[]; preview?: boolean }) {
  const t = useTranslations()
  const { data: responses = [] } = useSatisfaction()
  const [, refresh] = useState(0)
  const asks = pendingSurveys(clientId, projects, milestones, responses)
  if (asks.length === 0) return null
  return (
    <section className="rounded-3xl border border-primary/30 bg-card p-4 shadow-panel md:p-5">
      <h2 className="text-base font-semibold">{t("csatTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("csatHint")}</p>
      <ul className="flex flex-col gap-3">
        {asks.map((ask) => <SurveyForm key={`${ask.project.id}-${ask.milestone?.id ?? "p"}`} ask={ask} clientId={clientId} viewerName={viewerName} preview={preview} onDone={() => refresh((n) => n + 1)} />)}
      </ul>
    </section>
  )
}

/** Answers received, with the average and the NPS, for the project page and the client profile. */
export function FeedbackList({ responses, projects, milestones, showProject }: { responses: SatisfactionResponse[]; projects: WorkProject[]; milestones: Milestone[]; showProject?: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const stats = satisfactionStats(responses)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso))
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("csatFeedback")}</h3>
          <p className="text-xs text-muted-foreground">{t("csatFeedbackHint")}</p>
        </div>
        {stats.count > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5"><Stars value={stats.average ?? 0} /> <span className="font-semibold tabular-nums">{stats.average}</span></span>
            <span className="text-muted-foreground">{t("csatNpsShort", { nps: stats.nps ?? 0 })}</span>
          </div>
        )}
      </div>
      {responses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("csatNone")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {responses.map((r) => {
            const project = projects.find((p) => p.id === r.projectId)
            const milestone = milestones.find((m) => m.id === r.milestoneId)
            return (
              <li key={r.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{t("csatNpsAnswer", { nps: r.nps })}</span>
                  {r.rating <= LOW_RATING && <Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">{t("csatLow")}</Badge>}
                  <span className="ms-auto text-xs text-muted-foreground">{date(r.answeredAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {showProject && project ? `${project.name} · ` : ""}
                  {milestone ? milestone.title : t("csatWholeProject")} · {r.respondentName}
                </p>
                {r.comment && <p className="text-sm">“{r.comment}”</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Feedback of one project or one client, loading its own data. */
export function FeedbackSection({ projectId, clientId }: { projectId?: string; clientId?: string }) {
  const { data: responses = [] } = useSatisfaction()
  const { data: projects = [] } = useProjects()
  const { data: milestones = [] } = useMilestones()
  const rows = responses.filter((r) => (!projectId || r.projectId === projectId) && (!clientId || r.clientId === clientId))
  return <FeedbackList responses={rows} projects={projects} milestones={milestones} showProject={!projectId} />
}
