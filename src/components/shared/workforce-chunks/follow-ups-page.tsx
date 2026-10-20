"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, CalendarDays, CheckCircle, ChevronLeft, ChevronRight, Clock, ListChecks, Plus } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useClients } from "@/hooks/workforce/use-workforce"
import { can } from "@/lib/permissions/can"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { FOLLOW_UP_WHEN, followUpCounts, followUpWhen, sortFollowUps, type FollowUpWhen } from "@/lib/workforce/follow-ups"
import { calendarIso, todayIso } from "@/lib/workforce/project-metrics"
import { isWeekend } from "@/lib/workforce/planning"
import { cn } from "@/lib/utils"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import type { ClientFollowUp } from "@/types/work-crm"
import { FollowUpDialog } from "./follow-up-dialog"
import { FollowUpList, WHEN_CLASS, WHEN_DOT } from "./follow-up-list"

type Filter = "open" | FollowUpWhen
type View = "list" | "calendar"
const FILTERS: Filter[] = ["open", "late", "today", "week", "done"]
const MAX_PER_DAY = 3

const pill = (on: boolean) =>
  cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")

/**
 * Every follow-up of the workspace (CRM step 5): mine or everyone's, by when
 * they are due, as a list or on a month calendar.
 */
export default function FollowUpsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const me = useCurrentEmployee()
  const canEdit = can(authedUser, P.CLIENTS_UPDATE)
  const { data: all = [], isLoading } = useFollowUps()
  const { data: clients = [] } = useClients()
  const params = useSearchParams()
  const today = todayIso()

  const [mine, setMine] = React.useState(params.get("mine") === "1" || (!canEdit && !!me))
  const [filter, setFilter] = React.useState<Filter>("open")
  const [view, setView] = React.useState<View>(params.get("view") === "calendar" ? "calendar" : "list")
  const [month, setMonth] = React.useState(today.slice(0, 7))
  const [editing, setEditing] = React.useState<ClientFollowUp | null>(null)
  const [planning, setPlanning] = React.useState(false)

  const scoped = React.useMemo(() => sortFollowUps(all.filter((f) => !mine || f.ownerId === me?.id)), [all, mine, me?.id])
  const counts = followUpCounts(scoped, today)
  const shown = scoped.filter((f) => {
    const when = followUpWhen(f, today)
    return filter === "open" ? when !== "done" : when === filter
  })

  const cards: MetricCardItem[] = [
    { key: "late", title: t("fuLate"), value: counts.late, valueClassName: counts.late ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("fuLateHint") } },
    { key: "today", title: t("fuDueToday"), value: counts.today, valueClassName: counts.today ? "text-warning-foreground" : undefined, footer: { icon: Clock, text: t("fuDueTodayHint") } },
    { key: "week", title: t("fuThisWeek"), value: counts.week, footer: { icon: CalendarDays, text: t("fuThisWeekHint") } },
    { key: "done", title: t("fuDoneRecently"), value: counts.doneRecently, valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("fuDoneRecentlyHint") } },
  ]

  const openEdit = (f: ClientFollowUp) => setEditing(f)
  const empty = (
    <EmptyState
      icon={ListChecks}
      title={filter === "done" ? t("fuNoneDone") : t("fuNone")}
      hint={t("fuNoneHint")}
      action={canEdit ? <Button onClick={() => setPlanning(true)}><Plus className="size-4" />{t("fuPlan")}</Button> : undefined}
    />
  )

  // list grouped by when they are due, when every open one is shown
  const groups = filter === "open" ? FOLLOW_UP_WHEN.filter((w) => w !== "done").map((w) => ({ when: w, items: shown.filter((f) => followUpWhen(f, today) === w) })).filter((g) => g.items.length) : null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader actions={canEdit && <Button variant="primary" onClick={() => setPlanning(true)}><Plus className="size-4" />{t("fuPlan")}</Button>}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-full border border-border bg-card p-1" role="group" aria-label={t("fuWhose")}>
              {[{ on: true, label: t("fuMine") }, { on: false, label: t("fuEveryone") }].map((o) => (
                <button key={o.label} type="button" aria-pressed={mine === o.on} disabled={o.on && !me} onClick={() => setMine(o.on)} className={cn("h-7 rounded-full px-3 text-xs font-medium disabled:opacity-40", mine === o.on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {o.label}
                </button>
              ))}
            </div>
            {view === "list" && (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("show")}>
                {FILTERS.map((f) => (
                  <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={pill(filter === f)}>
                    {t(`fuFilter_${f}`)}
                    <span className="tabular-nums opacity-70">{f === "open" ? counts.open : scoped.filter((x) => followUpWhen(x, today) === f).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex rounded-full border border-border bg-card p-1" role="group" aria-label={t("fuView")}>
            {(["list", "calendar"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {v === "list" ? <ListChecks className="size-3.5" /> : <CalendarDays className="size-3.5" />}
                {t(`fuView_${v}`)}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <MetricCardGrid cards={cards} isLoading={isLoading} columnsClassName="grid-cols-2 xl:grid-cols-4" />

      {isLoading ? (
        <ListSkeleton />
      ) : view === "calendar" ? (
        <FollowUpCalendar items={scoped} month={month} setMonth={setMonth} today={today} locale={locale} clientName={(id) => clients.find((c) => c.id === id)?.name ?? ""} onOpen={canEdit ? openEdit : undefined} />
      ) : groups ? (
        groups.length === 0 ? (
          empty
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.when} aria-labelledby={`fu-${g.when}`} className="rounded-3xl border border-border bg-card p-5 shadow-panel">
                <h2 id={`fu-${g.when}`} className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", WHEN_DOT[g.when])} aria-hidden />
                  {t(`fuGroup_${g.when}`)}
                  <span className="font-normal text-muted-foreground">{g.items.length}</span>
                </h2>
                <FollowUpList items={g.items} canEdit={canEdit} onEdit={openEdit} empty={null} />
              </section>
            ))}
          </div>
        )
      ) : (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <FollowUpList items={shown} canEdit={canEdit} onEdit={openEdit} empty={empty} />
        </section>
      )}

      <FollowUpDialog open={planning || !!editing} onOpenChange={(o) => { if (!o) { setPlanning(false); setEditing(null) } }} followUp={editing} />
    </div>
  )
}

function FollowUpCalendar({ items, month, setMonth, today, locale, clientName, onOpen }: { items: ClientFollowUp[]; month: string; setMonth: (m: string) => void; today: string; locale: string; clientName: (id: string) => string; onOpen?: (f: ClientFollowUp) => void }) {
  const t = useTranslations()
  const first = `${month}-01`
  const days = Array.from({ length: 42 }, (_, i) => addDays(weekStart(first), i))
  const byDay = (d: string) => items.filter((f) => f.dueDate === d)
  const shift = (delta: number) => {
    const d = new Date(`${first}T00:00:00`)
    d.setMonth(d.getMonth() + delta)
    setMonth(calendarIso(d).slice(0, 7))
  }
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o).format(new Date(`${iso}T00:00:00`))
  const chip = (f: ClientFollowUp) => {
    const when = followUpWhen(f, today)
    const label = `${clientName(f.clientId)} · ${f.title}`
    const cls = cn("flex min-w-0 items-center rounded-md px-1.5 py-0.5 text-start text-[11px] font-medium", WHEN_CLASS[when], when === "done" && "line-through opacity-70")
    return onOpen ? (
      <button key={f.id} type="button" title={label} onClick={() => onOpen(f)} disabled={!!f.doneAt} className={cn(cls, "hover:opacity-80")}><span className="truncate">{label}</span></button>
    ) : (
      <span key={f.id} title={label} className={cls}><span className="truncate">{label}</span></span>
    )
  }
  const monthDays = days.filter((d) => d.startsWith(month) && byDay(d).length)

  return (
    <section className="rounded-3xl border border-border bg-card shadow-panel">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1 rounded-full border border-border p-1">
          <Button variant="ghost" size="sm" aria-label={t("previousMonth")} onClick={() => shift(-1)}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">{fmt(first, { month: "long", year: "numeric" })}</span>
          <Button variant="ghost" size="sm" aria-label={t("nextMonth")} onClick={() => shift(1)}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
        </div>
        {month !== today.slice(0, 7) && <Button variant="outline" size="sm" onClick={() => setMonth(today.slice(0, 7))}>{t("today")}</Button>}
      </div>
      {/* month grid (tablet and up) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-muted-foreground">
          {days.slice(0, 7).map((d) => <div key={d} className="px-3 py-2.5 capitalize">{fmt(d, { weekday: "short" })}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const list = byDay(d)
            const inMonth = d.startsWith(month)
            return (
              <div key={d} className={cn("flex min-h-28 flex-col gap-1 border-border p-1.5", i % 7 !== 6 && "border-e", i < 35 && "border-b", (!inMonth || isWeekend(d)) && "bg-muted/30")}>
                <span className={cn("flex size-6 items-center justify-center self-end rounded-full text-xs tabular-nums", d === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60")}>{Number(d.slice(8))}</span>
                {list.slice(0, MAX_PER_DAY).map(chip)}
                {list.length > MAX_PER_DAY && <span className="px-1.5 text-[11px] text-muted-foreground">{t("moreCount", { count: list.length - MAX_PER_DAY })}</span>}
              </div>
            )
          })}
        </div>
      </div>
      {/* agenda (phones) */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        {monthDays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("nothingThisMonth")}</p>}
        {monthDays.map((d) => (
          <div key={d} className="flex flex-col gap-1.5">
            <h3 className={cn("text-xs font-semibold", d === today ? "text-primary" : "text-muted-foreground")}>{fmt(d, { weekday: "long", day: "numeric", month: "short" })}</h3>
            {byDay(d).map(chip)}
          </div>
        ))}
      </div>
    </section>
  )
}
