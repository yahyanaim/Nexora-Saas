"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CheckCircle2, Star } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { averageRating, isComplete, reviewAction, type ReviewViewer } from "@/lib/workforce/reviews"
import { REVIEW_CRITERIA, type PerformanceReview, type ReviewCriterion, type ReviewKpiSnapshot, type ReviewRatings } from "@/types/work-reviews"
import type { Employee } from "@/types/workforce"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { REVIEW_STATUS_CLASS, REVIEW_STATUS_LABEL } from "./review-labels"
import { useReviewMutations } from "./use-reviews"

interface Props {
  review: PerformanceReview | null
  employees: Employee[]
  viewer: ReviewViewer
  /** KPIs of the review period, computed live until the review is completed */
  liveKpis: (review: PerformanceReview) => ReviewKpiSnapshot
  currency: string
  onOpenChange: (open: boolean) => void
}

/** One review: the period's KPIs, the self-assessment, the reviewer's assessment and goals (HR-9). */
export function ReviewSheet({ review, employees, viewer, liveKpis, currency, onOpenChange }: Props) {
  const t = useTranslations()
  const person = employees.find((e) => e.id === review?.employeeId)
  const reviewer = employees.find((e) => e.id === review?.reviewerId)
  return (
    <Sheet open={!!review} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {review && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <SpaceAvatar name={person?.name ?? "?"} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{person?.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {review.period} · {t("reviewedBy", { name: reviewer?.name ?? "—" })}
                  </SheetDescription>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className={REVIEW_STATUS_CLASS[review.status]}>{t(REVIEW_STATUS_LABEL[review.status])}</Badge>
              </div>
            </SheetHeader>
            {/* Re-mount per review so drafts never leak from one person to another */}
            <ReviewBody key={review.id} review={review} viewer={viewer} kpis={review.kpis ?? liveKpis(review)} frozen={!!review.kpis} currency={currency} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ReviewBody({ review, viewer, kpis, frozen, currency }: { review: PerformanceReview; viewer: ReviewViewer; kpis: ReviewKpiSnapshot; frozen: boolean; currency: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const action = reviewAction(review, viewer)
  const m = useReviewMutations(viewer)
  const [ratings, setRatings] = useState<ReviewRatings>({})
  const [comment, setComment] = useState("")
  const [goals, setGoals] = useState("")
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso))
  const pct = (v: number | null) => (v === null ? "—" : `${v}%`)

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <Section title={frozen ? t("reviewKpisFrozen") : t("reviewKpisLive")}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("kpi_utilization"), pct(kpis.utilization)],
            [t("kpi_onTime"), pct(kpis.onTime)],
            [t("kpi_estimateAccuracy"), pct(kpis.estimateAccuracy)],
            [t("kpi_revenue"), formatMoney(kpis.revenue, currency, locale)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-base font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{t("reviewPeriodRange", { from: date(review.from), to: date(review.to) })}</p>
      </Section>

      <Section title={t("reviewSelfTitle")}>
        {review.self ? (
          <Submitted ratings={review.self.ratings} comment={review.self.comment} at={date(review.self.submittedAt)} />
        ) : action === "self" ? (
          <>
            <p className="text-sm text-muted-foreground">{t("reviewSelfHint")}</p>
            <RatingsInput value={ratings} onChange={setRatings} />
            <Field label={t("reviewSelfComment")}>
              <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("reviewSelfPlaceholder")} />
            </Field>
            <Button disabled={!isComplete(ratings) || m.submitSelf.isPending} onClick={() => m.submitSelf.mutate({ id: review.id, ratings, comment })}>
              {t("reviewSendToReviewer")}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("reviewWaitingSelf")}</p>
        )}
      </Section>

      <Section title={t("reviewManagerTitle")}>
        {review.manager ? (
          <>
            <Submitted ratings={review.manager.ratings} comment={review.manager.comment} at={date(review.manager.submittedAt)} />
            {review.manager.goals && (
              <div className="rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("reviewGoals")}</p>
                <p className="whitespace-pre-line text-sm">{review.manager.goals}</p>
              </div>
            )}
          </>
        ) : action === "manager" ? (
          <>
            <p className="text-sm text-muted-foreground">{t("reviewManagerHint")}</p>
            <RatingsInput value={ratings} onChange={setRatings} compare={review.self?.ratings} />
            <Field label={t("reviewManagerComment")}>
              <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            <Field label={t("reviewGoals")}>
              <Textarea rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder={t("reviewGoalsPlaceholder")} />
            </Field>
            <Button
              disabled={!isComplete(ratings) || !comment.trim() || m.submitManager.isPending}
              onClick={() => m.submitManager.mutate({ id: review.id, input: { ratings, comment, goals }, kpis })}
            >
              {t("reviewComplete")}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{review.status === "self" ? t("reviewAfterSelf") : t("reviewWaitingManager")}</p>
        )}
      </Section>

      {review.status === "done" && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
          <CheckCircle2 className={cn("size-5", review.acknowledgedAt ? "text-success-foreground" : "text-muted-foreground")} />
          <span className="flex-1">{review.acknowledgedAt ? t("reviewAcknowledgedOn", { date: date(review.acknowledgedAt) }) : t("reviewNotAcknowledged")}</span>
          {action === "acknowledge" && (
            <Button size="sm" disabled={m.acknowledge.isPending} onClick={() => m.acknowledge.mutate(review.id)}>{t("reviewAcknowledge")}</Button>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-3.5", n <= value ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </span>
  )
}

function Submitted({ ratings, comment, at }: { ratings: ReviewRatings; comment: string; at: string }) {
  const t = useTranslations()
  const avg = averageRating(ratings)
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
      <ul className="flex flex-col gap-1.5">
        {REVIEW_CRITERIA.map((c) => (
          <li key={c} className="flex items-center justify-between gap-3 text-sm">
            <span>{t(`reviewCrit_${c}`)}</span>
            <Stars value={ratings[c] ?? 0} />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="font-medium">{t("reviewAverage")}</span>
        <span className="font-semibold tabular-nums">{avg ?? "—"} / 5</span>
      </div>
      {comment && <p className="whitespace-pre-line text-sm">{comment}</p>}
      <p className="text-xs text-muted-foreground">{t("reviewSubmittedOn", { date: at })}</p>
    </div>
  )
}

/** One row of 1–5 buttons per criterion; shows the self-rating next to it for the reviewer. */
function RatingsInput({ value, onChange, compare }: { value: ReviewRatings; onChange: (v: ReviewRatings) => void; compare?: ReviewRatings }) {
  const t = useTranslations()
  return (
    <ul className="flex flex-col gap-2">
      {REVIEW_CRITERIA.map((c: ReviewCriterion) => (
        <li key={c} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{t(`reviewCrit_${c}`)}</span>
            <span className="block text-xs text-muted-foreground">
              {t(`reviewCritHint_${c}`)}
              {compare?.[c] ? ` · ${t("reviewSelfRated", { value: compare[c]! })}` : ""}
            </span>
          </span>
          <span className="flex gap-1" role="radiogroup" aria-label={t(`reviewCrit_${c}`)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value[c] === n}
                aria-label={`${n}`}
                onClick={() => onChange({ ...value, [c]: n })}
                className={cn(
                  "size-8 rounded-full border text-sm font-medium tabular-nums transition-colors",
                  value[c] === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                )}
              >
                {n}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}
