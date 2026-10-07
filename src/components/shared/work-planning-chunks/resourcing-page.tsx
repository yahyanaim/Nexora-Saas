"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarRange, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, UserPlus, UsersRound, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useBookingMutations, useBookings } from "@/hooks/workforce/use-bookings"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { capacityForecast, forecastWeeks, openRoleHours, type WeekLoad } from "@/lib/workforce/resource-planning"
import { cn } from "@/lib/utils"
import { EmployeeStatus } from "@/types/workforce"
import type { ResourceBooking, ResourceBookingInput } from "@/types/work-planning"

const ROLE = "__role__"
const WEEKS = 12

const LOAD_CLASS: Record<WeekLoad, string> = {
  free: "bg-muted/50 text-muted-foreground",
  ok: "bg-info-soft text-info-foreground",
  full: "bg-warning-soft text-warning-foreground",
  over: "bg-danger-soft text-destructive",
}

const emptyBooking = (monday: string): ResourceBookingInput => ({ projectId: "", employeeId: "", startDate: monday, endDate: addDays(monday, 4 * 7 + 4), hoursPerWeek: 20, tentative: false })

/** Who is booked on what in the coming weeks, against their capacity (Phase 6g.1). */
export default function ResourcingPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { data: bookings = [], isLoading } = useBookings()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const { save, assign, remove } = useBookingMutations()
  const holidays = useMemo(() => (settings?.holidays ?? []).map((h) => h.date), [settings])

  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<{ id?: string; asRole: boolean; input: ResourceBookingInput } | null>(null)
  const [deleting, setDeleting] = useState<ResourceBooking | null>(null)

  const mondays = useMemo(() => forecastWeeks(addDays(todayIso(), offset * 7), WEEKS), [offset])
  const rows = useMemo(() => capacityForecast({ employees, bookings, leave, holidays }, mondays), [employees, bookings, leave, holidays, mondays])
  const roles = useMemo(() => openRoleHours(bookings, mondays, holidays), [bookings, mondays, holidays])

  const next4 = rows.map((r) => r.weeks.slice(0, 4))
  const cap4 = next4.flat().reduce((s, w) => s + w.capacity, 0)
  const conf4 = next4.flat().reduce((s, w) => s + w.confirmed, 0)
  const tent4 = next4.flat().reduce((s, w) => s + w.tentative, 0)
  const overPeople = next4.filter((weeks) => weeks.some((w) => w.load === "over")).length
  const roleHours = roles.reduce((s, r) => s + (r.weeks[0] ?? 0), 0)

  const cards: MetricCardItem[] = [
    { key: "booked", title: t("resBooked4"), value: cap4 > 0 ? `${Math.round((conf4 / cap4) * 100)}%` : "—", valueClassName: "text-primary", footer: { icon: CalendarRange, text: t("resBooked4Hint", { hours: Math.round(conf4), capacity: Math.round(cap4) }) } },
    { key: "over", title: t("resOverbooked"), value: overPeople, valueClassName: overPeople ? "text-destructive" : undefined, footer: { icon: Warning, text: t("resOverbookedHint") } },
    { key: "roles", title: t("resOpenRoles"), value: `${roleHours} h`, valueClassName: roleHours ? "text-warning-foreground" : undefined, footer: { icon: UserPlus, text: t("resOpenRolesHint", { count: roles.length }) } },
    { key: "tent", title: t("resTentative"), value: `${Math.round(tent4)} h`, footer: { icon: UsersRound, text: t("resTentativeHint") } },
  ]

  const weekLabel = (m: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${m}T00:00:00`))
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—"
  const personName = (id?: string) => employees.find((e) => e.id === id)?.name
  const set = (patch: Partial<ResourceBookingInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))
  const isRole = editing?.asRole ?? false
  const bookable = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE && e.weeklyCapacity > 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={<Button onClick={() => setEditing({ asRole: false, input: emptyBooking(mondays[0]!) })}><Plus className="size-4" /> {t("resBook")}</Button>} />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("resForecast")}</h2>
            <p className="text-sm text-muted-foreground">{t("resForecastHint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="outline" aria-label={t("resEarlier")} onClick={() => setOffset((o) => o - 4)}><ChevronLeft className="size-4" /></Button>
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(0)}>{t("resThisWeek")}</Button>
            <Button size="icon-sm" variant="outline" aria-label={t("resLater")} onClick={() => setOffset((o) => o + 4)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(["free", "ok", "full", "over"] as WeekLoad[]).map((l) => (
            <span key={l} className="flex items-center gap-1.5"><span className={cn("size-3 rounded", LOAD_CLASS[l])} />{t(`resLoad_${l}`)}</span>
          ))}
          <span>{t("resTentativeLegend")}</span>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="sticky start-0 bg-muted/40 px-3 py-2 text-start font-medium">{t("employee")}</th>
                  {mondays.map((m) => <th key={m} className="px-1 py-2 text-center font-medium">{weekLabel(m)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ employee, weeks }) => (
                  <tr key={employee.id}>
                    <td className="sticky start-0 bg-card px-3 py-2">
                      <p className="truncate font-medium">{employee.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{employee.jobTitle}</p>
                    </td>
                    {weeks.map((w) => (
                      <td key={w.monday} className="px-1 py-1.5">
                        <div
                          className={cn("rounded-lg px-1 py-1.5 text-center tabular-nums", LOAD_CLASS[w.load])}
                          title={t("resCellTitle", { confirmed: w.confirmed, tentative: w.tentative, capacity: w.capacity })}
                        >
                          <span className="text-xs font-medium">{w.confirmed}/{w.capacity}</span>
                          {w.tentative > 0 && <span className="block text-[10px] opacity-80">+{w.tentative}</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                {roles.map(({ booking, weeks }) => (
                  <tr key={booking.id} className="bg-warning-soft/30">
                    <td className="sticky start-0 bg-card px-3 py-2">
                      <p className="truncate font-medium italic">{booking.roleTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{t("resOpenRole")} · {projectName(booking.projectId)}</p>
                    </td>
                    {weeks.map((h, i) => (
                      <td key={mondays[i]} className="px-1 py-1.5 text-center text-xs tabular-nums text-warning-foreground">{h > 0 ? `${h} h` : ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="text-base font-semibold">{t("resBookings")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("resBookingsHint")}</p>
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t("resEmpty")} hint={t("resEmptyHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {[...bookings].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{personName(b.employeeId) ?? <span className="italic">{b.roleTitle}</span>} · {projectName(b.projectId)}</p>
                  <p className="truncate text-xs text-muted-foreground">{date(b.startDate)} → {date(b.endDate)} · {t("resPerWeek", { hours: b.hoursPerWeek })}{b.note ? ` · ${b.note}` : ""}</p>
                </div>
                {b.tentative && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t("resTentativeBadge")}</Badge>}
                {!b.employeeId && (
                  <Select onValueChange={(v) => assign.mutate({ id: b.id, employeeId: v })}>
                    <SelectTrigger className="h-8 w-44 bg-card" aria-label={t("resAssign")}><SelectValue placeholder={t("resAssign")} /></SelectTrigger>
                    <SelectContent>{bookable.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => setEditing({ id: b.id, asRole: !b.employeeId, input: { projectId: b.projectId, employeeId: b.employeeId ?? "", roleTitle: b.roleTitle, startDate: b.startDate, endDate: b.endDate, hoursPerWeek: b.hoursPerWeek, tentative: b.tentative, note: b.note } })}><Pencil className="size-4" /></Button>
                  <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(b)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode={editing?.id ? "edit" : "create"}
        createTitle={t("resBook")}
        editTitle={t("resEditBooking")}
        description={t("resFormHint")}
        isSubmitting={save.isPending}
        onSubmit={() => editing && save.mutate({ id: editing.id, input: editing.input }, { onSuccess: () => setEditing(null) })}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("resWho")}</Label>
              <Select value={isRole ? ROLE : editing.input.employeeId || undefined} onValueChange={(v) => setEditing((e) => (e ? { ...e, asRole: v === ROLE, input: { ...e.input, employeeId: v === ROLE ? "" : v } } : e))}>
                <SelectTrigger className="w-full bg-card" aria-label={t("resWho")}><SelectValue placeholder={t("resChoosePerson")}>{isRole ? t("resPlaceholderRole") : personName(editing.input.employeeId)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE}>{t("resPlaceholderRole")}</SelectItem>
                  {bookable.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.jobTitle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isRole && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="bk-role">{t("resRoleTitle")}</Label>
                <Input id="bk-role" placeholder={t("resRolePlaceholder")} value={editing.input.roleTitle ?? ""} onChange={(e) => set({ roleTitle: e.target.value })} />
              </div>
            )}
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("project")}</Label>
              <Select value={editing.input.projectId || undefined} onValueChange={(v) => set({ projectId: v })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("project")}><SelectValue placeholder={t("resChooseProject")}>{editing.input.projectId ? projectName(editing.input.projectId) : undefined}</SelectValue></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-start">{t("startDate")}</Label>
              <Input id="bk-start" type="date" value={editing.input.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-end">{t("endDate")}</Label>
              <Input id="bk-end" type="date" value={editing.input.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-hours">{t("hoursPerWeek")}</Label>
              <Input id="bk-hours" type="number" min={1} max={80} value={editing.input.hoursPerWeek} onChange={(e) => set({ hoursPerWeek: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Switch id="bk-tent" checked={editing.input.tentative} onCheckedChange={(v) => set({ tentative: v })} />
              <Label htmlFor="bk-tent">{t("resTentativeLabel")}</Label>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="bk-note">{t("notes")}</Label>
              <Textarea id="bk-note" rows={2} value={editing.input.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("resDeleteTitle")}
        description={t("resDeleteConfirm")}
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
