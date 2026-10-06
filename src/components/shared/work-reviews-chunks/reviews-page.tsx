"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, ClipboardCheck, Clock, Plus, Star, Trash2, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { can } from "@/lib/permissions/can"
import { employeeKpis } from "@/lib/workforce/kpis"
import { averageRating, canSeeReview, reviewAction, reviewCandidates } from "@/lib/workforce/reviews"
import { AdminPermissionsPlatform } from "@/types/roles"
import { WorkRole, type Employee } from "@/types/workforce"
import { ReviewStatus, type PerformanceReview } from "@/types/work-reviews"
import { REVIEW_STATUS_CLASS, REVIEW_STATUS_LABEL } from "./review-labels"
import { ReviewSheet } from "./review-sheet"
import { useReviewMutations, useReviews } from "./use-reviews"

const ALL = "__all__"

/** Performance reviews (HR-9): cycles, self-assessments, reviewer assessments and goals. */
export default function ReviewsPage() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const { data: reviews = [], isLoading } = useReviews()
  const { data: employees = [] } = useEmployees()
  const { data: entries = [] } = useTimeEntries()
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: clients = [] } = useClients()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const [cycle, setCycle] = useState(ALL)
  const [openId, setOpenId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState<PerformanceReview | null>(null)

  const isAdmin = can(authedUser, AdminPermissionsPlatform.ROLES_UPDATE)
  const canStart = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_UPDATE)
  const me = employees.find((e) => e.id === (authedUser as { employeeId?: string } | undefined)?.employeeId || e.email === authedUser?.email)
  const viewer = { employeeId: me?.id, isAdmin }
  const m = useReviewMutations(viewer)
  const holidays = useMemo(() => settings?.holidays.map((h) => h.date) ?? [], [settings])
  const person = (id: string) => employees.find((e) => e.id === id)

  const visible = reviews.filter((r) => canSeeReview(r, viewer, employees))
  const cycles = [...new Set(visible.map((r) => r.period))].sort().reverse()
  const shown = visible
    .filter((r) => cycle === ALL || r.period === cycle)
    .sort((a, b) => b.to.localeCompare(a.to) || (person(a.employeeId)?.name ?? "").localeCompare(person(b.employeeId)?.name ?? ""))
  const mine = shown.filter((r) => reviewAction(r, viewer))
  const others = shown.filter((r) => !reviewAction(r, viewer))
  const done = shown.filter((r) => r.status === ReviewStatus.DONE)
  const avgs = done.map((r) => averageRating(r.manager?.ratings)).filter((x): x is number => x !== null)

  const cards: MetricCardItem[] = [
    { key: "todo", title: t("reviewToDo"), value: mine.length, valueClassName: mine.length ? "text-primary" : undefined, footer: { icon: ClipboardCheck, text: t("reviewToDoHint") } },
    { key: "self", title: t("reviewStatus_self"), value: shown.filter((r) => r.status === ReviewStatus.SELF).length, footer: { icon: Clock, text: t("reviewWaitingEmployees") } },
    { key: "manager", title: t("reviewStatus_manager"), value: shown.filter((r) => r.status === ReviewStatus.MANAGER).length, footer: { icon: Users, text: t("reviewWaitingReviewers") } },
    {
      key: "done",
      title: t("reviewStatus_done"),
      value: done.length,
      valueClassName: "text-success-foreground",
      footer: { icon: Star, text: avgs.length ? t("reviewAverageIs", { value: (Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10).toString() }) : t("reviewNoneDone") },
    },
  ]

  const liveKpis = (r: PerformanceReview) => {
    const e = person(r.employeeId)
    if (!e) return { utilization: null, onTime: null, estimateAccuracy: null, revenue: 0 }
    const k = employeeKpis(e, { entries, tasks, projects, clients, leave, holidays }, r.from, r.to)
    return { utilization: k.utilization, onTime: k.onTime, estimateAccuracy: k.estimateAccuracy, revenue: k.revenue }
  }

  const row = (r: PerformanceReview) => {
    const p = person(r.employeeId)
    const reviewer = person(r.reviewerId)
    const avg = averageRating(r.manager?.ratings)
    const action = reviewAction(r, viewer)
    return (
      <li key={r.id} className="flex items-center gap-1">
        <button type="button" onClick={() => setOpenId(r.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5 text-start hover:bg-muted/60">
          <SpaceAvatar name={p?.name ?? "?"} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{p?.name}{p?.id === me?.id ? ` · ${t("you")}` : ""}</span>
            <span className="block truncate text-xs text-muted-foreground">{r.period} · {t("reviewedBy", { name: reviewer?.name ?? "—" })}</span>
          </span>
          {action && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">{t(`reviewAction_${action}`)}</span>}
          {avg !== null && (
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
              <Star className="size-4 fill-primary text-primary" /> {avg}
            </span>
          )}
          {r.status === ReviewStatus.DONE && r.acknowledgedAt && <CheckCircle2 className="size-4 text-success-foreground" aria-label={t("reviewAcknowledged")} />}
          <Badge variant="outline" className={REVIEW_STATUS_CLASS[r.status]}>{t(REVIEW_STATUS_LABEL[r.status])}</Badge>
        </button>
        {isAdmin && r.status !== ReviewStatus.DONE && (
          <Button variant="ghost" size="icon-sm" aria-label={t("reviewCancel")} onClick={() => setCancelling(r)}>
            <Trash2 />
          </Button>
        )}
      </li>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <>
            {cycles.length > 0 && (
              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger className="w-40 bg-card" aria-label={t("reviewCycle")}><SelectValue>{cycle === ALL ? t("reviewAllCycles") : cycle}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("reviewAllCycles")}</SelectItem>
                  {cycles.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {canStart && (
              <Button onClick={() => setStarting(true)}>
                <Plus className="size-4" /> {t("reviewStartCycle")}
              </Button>
            )}
          </>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {isLoading ? (
        <ListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("reviewEmpty")} hint={canStart ? t("reviewEmptyHintAdmin") : t("reviewEmptyHint")} />
      ) : (
        <>
          {mine.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
              <h2 className="mb-2 text-base font-semibold">{t("reviewNeedsYou")}</h2>
              <ul className="flex flex-col">{mine.map(row)}</ul>
            </section>
          )}
          {others.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
              <h2 className="mb-2 text-base font-semibold">{mine.length ? t("reviewOthers") : t("reviews")}</h2>
              <ul className="flex flex-col">{others.map(row)}</ul>
            </section>
          )}
        </>
      )}

      <ReviewSheet
        review={reviews.find((r) => r.id === openId) ?? null}
        employees={employees}
        viewer={viewer}
        liveKpis={liveKpis}
        currency={workspace.currency}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
      {starting && (
        <StartCycleDialog
          employees={employees}
          fallbackReviewerId={me?.id ?? employees.find((e) => e.role === WorkRole.ADMIN)?.id}
          pending={m.start.isPending}
          onClose={() => setStarting(false)}
          onStart={(input) => m.start.mutate({ input, employees }, { onSuccess: () => setStarting(false) })}
        />
      )}
      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reviewCancel")}</DialogTitle>
            <DialogDescription>{t("reviewCancelConfirm", { name: person(cancelling?.employeeId ?? "")?.name ?? "", period: cancelling?.period ?? "" })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelling(null)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={m.remove.isPending} onClick={() => cancelling && m.remove.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })}>
              {t("reviewCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Picks the cycle name, period and people; each person's manager becomes the reviewer. */
function StartCycleDialog({
  employees,
  fallbackReviewerId,
  pending,
  onClose,
  onStart,
}: {
  employees: Employee[]
  fallbackReviewerId?: string
  pending: boolean
  onClose: () => void
  onStart: (input: { period: string; from: string; to: string; employeeIds: string[]; fallbackReviewerId?: string }) => void
}) {
  const t = useTranslations()
  const year = new Date().getFullYear()
  const h2 = new Date().getMonth() >= 6
  const [period, setPeriod] = useState(`${h2 ? "H2" : "H1"} ${year}`)
  const [from, setFrom] = useState(h2 ? `${year}-07-01` : `${year}-01-01`)
  const [to, setTo] = useState(h2 ? `${year}-12-31` : `${year}-06-30`)
  const candidates = reviewCandidates(employees)
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.map((e) => e.id)))
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })
  const reviewerOf = (e: Employee) => employees.find((x) => x.id === (e.managerId ?? fallbackReviewerId))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("reviewStartCycle")}</DialogTitle>
          <DialogDescription>{t("reviewStartHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rv-name">{t("reviewCycle")}</Label>
            <Input id="rv-name" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rv-from">{t("from")}</Label>
            <Input id="rv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rv-to">{t("to")}</Label>
            <Input id="rv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-2xl border border-border p-2">
          {candidates.map((e) => {
            const reviewer = reviewerOf(e)
            const noReviewer = !reviewer || reviewer.id === e.id
            return (
              <li key={e.id}>
                <label className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted/60", noReviewer && "opacity-60")}>
                  <Checkbox checked={picked.has(e.id) && !noReviewer} disabled={noReviewer} onCheckedChange={(v) => toggle(e.id, !!v)} />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{noReviewer ? t("reviewNoReviewer") : t("reviewedBy", { name: reviewer.name })}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button
            disabled={pending}
            onClick={() =>
              onStart({ period, from, to, fallbackReviewerId, employeeIds: candidates.filter((e) => picked.has(e.id) && reviewerOf(e) && reviewerOf(e)!.id !== e.id).map((e) => e.id) })
            }
          >
            {t("reviewStart", { count: candidates.filter((e) => picked.has(e.id) && reviewerOf(e) && reviewerOf(e)!.id !== e.id).length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
