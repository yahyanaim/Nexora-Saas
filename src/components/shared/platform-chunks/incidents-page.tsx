"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarClock, Clock, Megaphone, Plus, Siren, Wrench } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useIncidents, useOpsMutations } from "@/hooks/platform/use-platform-ops"
import { consoleCan } from "@/lib/platform/console-roles"
import { MAINTENANCE_LEAD_HOURS, SERVICES, durationMinutes, isOpenIncident } from "@/lib/platform/ops-rules"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { Incident, IncidentSeverity, IncidentStatus, ServiceId } from "@/types/platform-ops"
import { Panel } from "./billing-shared"
import { IncidentStatusBadge, SeverityBadge, useMinutes } from "./ops-shared"
import { useSupportFormat } from "./support-shared"

const SEVERITIES: IncidentSeverity[] = ["sev1", "sev2", "sev3", "sev4"]
const NEXT_STATUSES: IncidentStatus[] = ["investigating", "identified", "monitoring"]

/** yyyy-mm-ddThh:mm in local time, for datetime-local inputs. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

/** Checkboxes for services, and for customers ("all" when none is ticked). */
function Picker<T extends string>({ legend, options, value, onChange, hint }: { legend: string; options: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <Checkbox key={o.id} checked={value.includes(o.id)} onCheckedChange={(on) => onChange(on ? [...value, o.id] : value.filter((x) => x !== o.id))} labelText={o.label} />
        ))}
      </div>
    </fieldset>
  )
}

/** Incidents and planned maintenance (INC-03, INC-04, INC-05, INC-07). */
export default function ConsoleIncidentsPage() {
  const t = useTranslations()
  const { dateTime } = useSupportFormat()
  const minutes = useMinutes()
  const actor = useConsoleActor()
  const { data: list = [], isLoading } = useIncidents()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useOpsMutations()
  const [now] = useState(() => new Date())
  const canManage = consoleCan(actor?.role, C.INCIDENTS)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = list.find((i) => i.id === openId) ?? null
  // detail actions
  const [update, setUpdate] = useState({ text: "", status: "" as IncidentStatus | "" })
  const [notice, setNotice] = useState("")
  const [close, setClose] = useState({ resolution: "", postmortem: "" })
  // forms
  const blankIncident = { title: "", severity: "sev3" as IncidentSeverity, services: [] as ServiceId[], customerIds: [] as string[], text: "" }
  const [incidentForm, setIncidentForm] = useState<typeof blankIncident | null>(null)
  const [maintForm, setMaintForm] = useState<{ title: string; services: ServiceId[]; customerIds: string[]; start: string; minutes: number; notice: string } | null>(null)

  const serviceOptions = SERVICES.map((s) => ({ id: s, label: t(`opsSvc_${s}`) }))
  const customerOptions = customers.filter((c) => c.status !== "cancelled" && c.status !== "deleted").map((c) => ({ id: c.id, label: c.name }))
  const customersText = (ids: string[]) => (ids.length === 0 ? t("incAllCustomers") : ids.map((id) => customers.find((c) => c.id === id)?.name ?? id).join(", "))
  const openDetail = (i: Incident) => {
    setOpenId(i.id)
    setUpdate({ text: "", status: "" })
    setNotice(i.notice ?? "")
    setClose({ resolution: "", postmortem: "" })
  }

  const incidents = list.filter((i) => i.kind === "incident")
  const resolved = incidents.filter((i) => i.status === "resolved")
  const nextMaint = list.filter((i) => i.kind === "maintenance" && i.status === "scheduled").sort((a, b) => (a.plannedStart ?? "").localeCompare(b.plannedStart ?? ""))[0]
  const cards: MetricCardItem[] = [
    { key: "open", title: t("incOpen"), value: incidents.filter(isOpenIncident).length, footer: { icon: Siren, text: t("incOpenHint") } },
    { key: "drafts", title: t("incDrafts"), value: incidents.filter((i) => i.status === "draft").length, footer: { icon: Megaphone, text: t("incDraftsHint") } },
    { key: "mttr", title: t("incMttr"), value: resolved.length ? minutes(Math.round(resolved.reduce((s, i) => s + durationMinutes(i), 0) / resolved.length)) : "—", footer: { icon: Clock, text: t("incMttrHint") } },
    { key: "next", title: t("incNextMaint"), value: nextMaint ? dateTime(nextMaint.plannedStart) : "—", footer: { icon: CalendarClock, text: nextMaint ? nextMaint.title : t("incNoMaint") } },
  ]

  const severityLabel = (s: IncidentSeverity) => t(`incSev_${s}`)
  const doneMaint = (i: Incident) => i.status === "completed" || i.status === "cancelled"

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMaintForm({ title: "", services: [], customerIds: [], start: localInput(new Date(now.getTime() + 72 * 3_600_000)), minutes: 60, notice: "" })}><Wrench className="size-4" />{t("mntPlan")}</Button>
            <Button onClick={() => setIncidentForm(blankIncident)}><Plus className="size-4" />{t("incNew")}</Button>
          </div>
        ) : undefined}
      />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      <Panel title={t("incList")} hint={t("incListHint")}>
        {isLoading ? <ListSkeleton /> : (
          <TableContainer>
            <Table className="min-w-[62rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("incIncident")}</TableHead>
                  <TableHead>{t("incSeverity")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("incServices")}</TableHead>
                  <TableHead>{t("incCustomers")}</TableHead>
                  <TableHead>{t("incStarted")}</TableHead>
                  <TableHead className="text-end">{t("incDuration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="max-w-80">
                      <button type="button" onClick={() => openDetail(i)} className="text-start font-medium hover:underline focus-visible:underline">
                        <span className="text-muted-foreground tabular-nums">{i.number}</span> · {i.title}
                      </button>
                      <span className="block text-xs text-muted-foreground">{t(i.kind === "maintenance" ? "incKindMaintenance" : i.source === "monitoring" ? "incFromMonitoring" : "incKindIncident")}{i.notifiedAt ? ` · ${t("incInformed")}` : ""}</span>
                    </TableCell>
                    <TableCell>{i.kind === "incident" ? <SeverityBadge severity={i.severity} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><IncidentStatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-sm">{i.services.map((s) => t(`opsSvc_${s}`)).join(", ")}</TableCell>
                    <TableCell className="max-w-56 text-sm">{customersText(i.customerIds)}</TableCell>
                    <TableCell className="text-sm">{dateTime(i.plannedStart ?? i.startedAt)}</TableCell>
                    <TableCell className="text-end text-sm tabular-nums">{i.kind === "maintenance" && !i.resolvedAt ? (i.plannedEnd && i.plannedStart ? minutes(Math.round((new Date(i.plannedEnd).getTime() - new Date(i.plannedStart).getTime()) / 60_000)) : "—") : minutes(durationMinutes(i, now))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("incSeverityNote")}</p>
      </Panel>

      {/* detail */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-xl">{open.number} · {open.title}</SheetTitle>
                <SheetDescription>{open.services.map((s) => t(`opsSvc_${s}`)).join(", ")} · {customersText(open.customerIds)}</SheetDescription>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {open.kind === "incident" && <SeverityBadge severity={open.severity} />}
                  <IncidentStatusBadge status={open.status} />
                </div>
              </SheetHeader>
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
                {open.notice && (
                  <div className="rounded-2xl bg-info-soft p-3 text-sm text-info-foreground">
                    <p className="font-medium">{t("incNoticeShown")}</p>
                    <p>{open.notice}</p>
                  </div>
                )}
                <section aria-labelledby="inc-timeline">
                  <h3 id="inc-timeline" className="mb-2 text-sm font-semibold">{t("incTimeline")}</h3>
                  <ol className="space-y-3 border-s border-border ps-4">
                    {open.timeline.map((e) => (
                      <li key={e.id} className="text-sm">
                        <p className="text-xs text-muted-foreground">{dateTime(e.at)} · {e.by}{e.status ? ` · ${t(`incSt_${e.status}`)}` : ""}</p>
                        <p>{e.text}</p>
                      </li>
                    ))}
                  </ol>
                </section>
                {open.resolution && (
                  <section className="space-y-1 text-sm">
                    <h3 className="font-semibold">{t("incResolution")}</h3>
                    <p>{open.resolution}</p>
                    {open.postmortem && <><h3 className="pt-2 font-semibold">{t("incPostmortem")}</h3><p className="whitespace-pre-wrap">{open.postmortem}</p></>}
                  </section>
                )}

                {canManage && open.kind === "incident" && open.status !== "resolved" && (
                  <>
                    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.update.mutate({ id: open.id, text: update.text, status: update.status || undefined }, { onSuccess: () => setUpdate({ text: "", status: "" }) }) }}>
                      <h3 className="text-sm font-semibold">{t(open.status === "draft" ? "incConfirmDraft" : "incAddUpdate")}</h3>
                      <Label htmlFor="inc-update" className="sr-only">{t("incUpdateText")}</Label>
                      <Textarea id="inc-update" rows={2} value={update.text} onChange={(e) => setUpdate({ ...update, text: e.target.value })} placeholder={t("incUpdateText")} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={update.status} onValueChange={(v) => setUpdate({ ...update, status: v as IncidentStatus })}>
                          <SelectTrigger className="w-48" aria-label={t("status")}><SelectValue placeholder={t("incKeepStatus")}>{update.status ? t(`incSt_${update.status}`) : undefined}</SelectValue></SelectTrigger>
                          <SelectContent>{NEXT_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`incSt_${s}`)}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button type="submit" size="sm" disabled={!update.text.trim() || m.update.isPending}>{t("incPostUpdate")}</Button>
                      </div>
                    </form>
                    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.notify.mutate({ id: open.id, notice }) }}>
                      <h3 className="text-sm font-semibold">{t("incNotifyTitle")}</h3>
                      <p className="text-xs text-muted-foreground">{t("incNotifyHint", { who: customersText(open.customerIds) })}</p>
                      <Label htmlFor="inc-notice" className="sr-only">{t("incNoticeLabel")}</Label>
                      <Textarea id="inc-notice" rows={2} value={notice} onChange={(e) => setNotice(e.target.value)} placeholder={t("incNoticeLabel")} />
                      <Button type="submit" size="sm" variant="outline" disabled={m.notify.isPending}><Megaphone className="size-4" />{t(open.notifiedAt ? "incNotifyAgain" : "incNotify")}</Button>
                    </form>
                    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.resolve.mutate({ id: open.id, ...close }) }}>
                      <h3 className="text-sm font-semibold">{t("incResolveTitle")}</h3>
                      <Label htmlFor="inc-resolution">{t("incResolution")}</Label>
                      <Textarea id="inc-resolution" rows={2} value={close.resolution} onChange={(e) => setClose({ ...close, resolution: e.target.value })} />
                      <Label htmlFor="inc-postmortem">{t(open.severity === "sev1" || open.severity === "sev2" ? "incPostmortemNeeded" : "incPostmortemOptional")}</Label>
                      <Textarea id="inc-postmortem" rows={3} value={close.postmortem} onChange={(e) => setClose({ ...close, postmortem: e.target.value })} aria-describedby="inc-pm-hint" />
                      <p id="inc-pm-hint" className="text-xs text-muted-foreground">{t("incPostmortemHint")}</p>
                      <Button type="submit" size="sm" disabled={m.resolve.isPending}>{t("incResolve")}</Button>
                    </form>
                  </>
                )}
                {canManage && open.kind === "maintenance" && !doneMaint(open) && (
                  <div className="flex flex-wrap gap-2">
                    {open.status === "scheduled" && <Button size="sm" onClick={() => m.updateMaintenance.mutate({ id: open.id, status: "in_progress", text: t("mntStartedText") })}>{t("mntStart")}</Button>}
                    <Button size="sm" variant="outline" onClick={() => m.updateMaintenance.mutate({ id: open.id, status: "completed", text: t("mntCompletedText") })}>{t("mntComplete")}</Button>
                    {open.status === "scheduled" && <Button size="sm" variant="outline" onClick={() => m.updateMaintenance.mutate({ id: open.id, status: "cancelled", text: t("mntCancelledText") })}>{t("mntCancel")}</Button>}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* new incident */}
      <DataTableEntityFormSheet
        open={!!incidentForm}
        onOpenChange={(v) => !v && setIncidentForm(null)}
        mode="create"
        createTitle={t("incNew")}
        editTitle=""
        description={t("incNewDesc")}
        isSubmitting={m.create.isPending}
        submitLabel={{ create: t("incOpenIt") }}
        onSubmit={() => incidentForm && m.create.mutate(incidentForm, { onSuccess: () => setIncidentForm(null) })}
      >
        {incidentForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inc-title">{t("incTitle")}</Label>
              <Input id="inc-title" value={incidentForm.title} onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-sev">{t("incSeverity")}</Label>
              <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v as IncidentSeverity })}>
                <SelectTrigger id="inc-sev"><SelectValue>{severityLabel(incidentForm.severity)}</SelectValue></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{severityLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Picker legend={t("incServices")} options={serviceOptions} value={incidentForm.services} onChange={(services) => setIncidentForm({ ...incidentForm, services })} />
            <Picker legend={t("incCustomers")} hint={t("incCustomersHint")} options={customerOptions} value={incidentForm.customerIds} onChange={(customerIds) => setIncidentForm({ ...incidentForm, customerIds })} />
            <div className="space-y-1.5">
              <Label htmlFor="inc-first">{t("incFirstUpdate")}</Label>
              <Textarea id="inc-first" rows={3} value={incidentForm.text} onChange={(e) => setIncidentForm({ ...incidentForm, text: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      {/* plan maintenance */}
      <DataTableEntityFormSheet
        open={!!maintForm}
        onOpenChange={(v) => !v && setMaintForm(null)}
        mode="create"
        createTitle={t("mntPlan")}
        editTitle=""
        description={t("mntPlanDesc", { hours: MAINTENANCE_LEAD_HOURS })}
        isSubmitting={m.schedule.isPending}
        submitLabel={{ create: t("mntAnnounce") }}
        onSubmit={() => {
          if (!maintForm) return
          const start = new Date(maintForm.start)
          m.schedule.mutate(
            { title: maintForm.title, services: maintForm.services, customerIds: maintForm.customerIds, notice: maintForm.notice, plannedStart: start.toISOString(), plannedEnd: new Date(start.getTime() + maintForm.minutes * 60_000).toISOString() },
            { onSuccess: () => setMaintForm(null) },
          )
        }}
      >
        {maintForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mnt-title">{t("incTitle")}</Label>
              <Input id="mnt-title" value={maintForm.title} onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mnt-start">{t("mntStartAt")}</Label>
                <Input id="mnt-start" type="datetime-local" value={maintForm.start} onChange={(e) => setMaintForm({ ...maintForm, start: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mnt-minutes">{t("sesDuration")}</Label>
                <Select value={String(maintForm.minutes)} onValueChange={(v) => setMaintForm({ ...maintForm, minutes: Number(v) })}>
                  <SelectTrigger id="mnt-minutes"><SelectValue>{minutes(maintForm.minutes)}</SelectValue></SelectTrigger>
                  <SelectContent>{[30, 45, 60, 120, 240].map((d) => <SelectItem key={d} value={String(d)}>{minutes(d)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Picker legend={t("incServices")} options={serviceOptions} value={maintForm.services} onChange={(services) => setMaintForm({ ...maintForm, services })} />
            <Picker legend={t("incCustomers")} hint={t("incCustomersHint")} options={customerOptions} value={maintForm.customerIds} onChange={(customerIds) => setMaintForm({ ...maintForm, customerIds })} />
            <div className="space-y-1.5">
              <Label htmlFor="mnt-notice">{t("incNoticeLabel")}</Label>
              <Textarea id="mnt-notice" rows={3} value={maintForm.notice} onChange={(e) => setMaintForm({ ...maintForm, notice: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>
    </div>
  )
}
