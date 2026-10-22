"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BadgeCheck, Bug, CircleHelp, Plus, Sparkles, XCircle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClientRequestMutations, useClientRequests } from "@/hooks/workforce/use-client-requests"
import { useChangeOrders } from "@/hooks/workforce/use-change-orders"
import { useTasks } from "@/hooks/workforce/use-work-projects"
import { usePortalMutations } from "@/hooks/workforce/use-portal"
import { MAX_REQUEST_DETAILS, MAX_REQUEST_TITLE, clientView, type ClientRequestView } from "@/lib/workforce/client-requests"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ChangeOrderStatus, WorkProjectStatus, type ChangeOrder, type WorkProject } from "@/types/work-projects"
import { RequestKind } from "@/types/work-requests"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"

export const KIND_ICON = { [RequestKind.CHANGE]: Sparkles, [RequestKind.BUG]: Bug, [RequestKind.QUESTION]: CircleHelp }

const VIEW_CLASS: Record<ClientRequestView, string> = {
  received: "bg-info-soft text-info-foreground border-transparent",
  later: "bg-muted text-muted-foreground border-transparent",
  planned: "bg-info-soft text-info-foreground border-transparent",
  working: "bg-warning-soft text-warning-foreground border-transparent",
  done: "bg-success-soft text-success-foreground border-transparent",
  declined: "bg-danger-soft text-destructive border-transparent",
  alreadyPlanned: "bg-muted text-muted-foreground border-transparent",
}

const NOT_SURE = "__not_sure__"

interface Props {
  clientId: string
  viewerName: string
  /** The client's projects (already filtered to this client) */
  projects: WorkProject[]
  /** Staff preview: nothing can be sent or decided */
  preview?: boolean
}

/**
 * The client's side of requests (P3): ask the team for something, follow
 * each request until it is done, and approve or decline the extra work the
 * team prices as a change order.
 */
export function PortalRequests({ clientId, viewerName, projects, preview }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const today = todayIso()
  const { data: requests = [] } = useClientRequests(clientId)
  const { data: tasks = [] } = useTasks()
  const { data: allChanges = [] } = useChangeOrders()
  const { create } = useClientRequestMutations()
  const { decideChange } = usePortalMutations()
  const [asking, setAsking] = useState(false)
  const [form, setForm] = useState({ projectId: NOT_SURE, kind: RequestKind.CHANGE, title: "", description: "", urgent: false })
  const [declining, setDeclining] = useState<ChangeOrder | null>(null)
  const [reason, setReason] = useState("")

  const open = projects.filter((p) => p.status !== WorkProjectStatus.COMPLETED && p.status !== WorkProjectStatus.CANCELLED)
  const projectIds = new Set(projects.map((p) => p.id))
  // Only the change orders of this client's projects, once the team has sent them
  const changes = allChanges.filter((o) => projectIds.has(o.projectId) && o.status !== ChangeOrderStatus.DRAFT)
  const toApprove = changes.filter((o) => o.status === ChangeOrderStatus.SENT)
  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name

  const send = () =>
    create.mutate(
      { clientId, by: viewerName, input: { projectId: form.projectId === NOT_SURE ? undefined : form.projectId, kind: form.kind, title: form.title, description: form.description, urgent: form.urgent } },
      {
        onSuccess: () => {
          setAsking(false)
          setForm({ projectId: NOT_SURE, kind: RequestKind.CHANGE, title: "", description: "", urgent: false })
        },
      }
    )
  const changeLine = (id?: string) => {
    const o = allChanges.find((x) => x.id === id)
    if (!o) return null
    const key = o.status === ChangeOrderStatus.DRAFT ? "rqPortalChangeDraft" : o.status === ChangeOrderStatus.SENT ? "rqPortalChangeSent" : o.status === ChangeOrderStatus.APPROVED ? "rqPortalChangeApproved" : "rqPortalChangeDeclined"
    return <p className="mt-1 text-xs text-muted-foreground">{t(key, { number: o.number, amount: money(o.amount) })}</p>
  }

  return (
    <>
      {toApprove.length > 0 && (
        <section aria-labelledby="portal-extra" className="rounded-3xl border border-warning/40 bg-card p-4 shadow-panel md:p-5">
          <h2 id="portal-extra" className="mb-1 text-base font-semibold">{t("rqPortalExtraTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("rqPortalExtraHint")}</p>
          <ul className="flex flex-col gap-3">
            {toApprove.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.number} · {projectName(o.projectId)}{o.sentAt ? ` · ${t("rqPortalSentOn", { date: formatShortDate(o.sentAt.slice(0, 10), locale) })}` : ""}</p>
                  {o.description && <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>}
                </div>
                <div className="text-end">
                  <p className="font-semibold tabular-nums">{money(o.amount)}</p>
                  <p className="text-xs text-muted-foreground">{t("rqPortalHours", { hours: o.hours })}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" disabled={preview || decideChange.isPending} onClick={() => decideChange.mutate({ clientId, changeOrderId: o.id, approved: true, by: viewerName })}>
                    <BadgeCheck className="size-4" /> {t("portalApprove")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={preview} onClick={() => setDeclining(o)}>
                    <XCircle className="size-4" /> {t("rqPortalDecline")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="portal-requests" className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="portal-requests" className="text-base font-semibold">{t("rqPortalTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("rqPortalHint")}</p>
          </div>
          <Button disabled={preview} onClick={() => setAsking(true)}>
            <Plus className="size-4" /> {t("rqAsk")}
          </Button>
        </div>
        {requests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t("rqPortalEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {requests.map((r) => {
              const view = clientView(r, tasks, today)
              const Icon = KIND_ICON[r.kind]
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.number} · {t(`rqKind_${r.kind}`)}{projectName(r.projectId) ? ` · ${projectName(r.projectId)}` : ""} · {formatShortDate(r.createdAt.slice(0, 10), locale)}
                    </p>
                    {view === "declined" && r.reason && <p className="mt-1 rounded-lg bg-danger-soft px-2 py-1 text-xs text-destructive">{t("rqPortalReason", { reason: r.reason })}</p>}
                    {view === "later" && r.snoozedUntil && <p className="mt-1 text-xs text-muted-foreground">{t("rqPortalLaterHint", { date: formatShortDate(r.snoozedUntil, locale) })}</p>}
                    {changeLine(r.changeOrderId)}
                  </div>
                  {r.urgent && <Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">{t("rqUrgent")}</Badge>}
                  <Badge variant="outline" className={cn("justify-center", VIEW_CLASS[view])}>{t(`rqView_${view}`)}</Badge>
                </li>
              )
            })}
          </ul>
        )}
        {changes.some((o) => o.status !== ChangeOrderStatus.SENT) && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("rqPortalPastChanges")}</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {changes.filter((o) => o.status !== ChangeOrderStatus.SENT).map((o) => (
                <li key={o.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
                  <span>{o.number} · {o.title}</span>
                  <span className="tabular-nums text-muted-foreground">{money(o.amount)} · {t(o.status === ChangeOrderStatus.APPROVED ? "rqPortalApproved" : "rqPortalDeclined")}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rqAskTitle")}</DialogTitle>
            <DialogDescription>{t("rqAskDescription")}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); send() }}>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">{t("rqKind")}</legend>
              <div className="flex flex-wrap gap-2">
                {Object.values(RequestKind).map((k) => {
                  const Icon = KIND_ICON[k]
                  return (
                    <button key={k} type="button" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k })} className={cn("flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm", form.kind === k ? "border-primary bg-info-soft font-medium text-primary" : "border-border hover:bg-muted")}>
                      <Icon className="size-4" aria-hidden /> {t(`rqKind_${k}`)}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="rq-project">{t("project")}</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger id="rq-project" className="w-full"><SelectValue>{form.projectId === NOT_SURE ? t("rqNotSure") : projectName(form.projectId)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SURE}>{t("rqNotSure")}</SelectItem>
                  {open.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rq-title">{t("rqWhat")}</Label>
              <Input id="rq-title" value={form.title} maxLength={MAX_REQUEST_TITLE} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("rqWhatPlaceholder")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rq-details">{t("rqDetails")}</Label>
              <Textarea id="rq-details" rows={4} value={form.description} maxLength={MAX_REQUEST_DETAILS} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("rqDetailsPlaceholder")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.urgent} onCheckedChange={(v) => setForm({ ...form, urgent: v === true })} />
              {t("rqUrgentLabel")}
            </label>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAsking(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={create.isPending || form.title.trim().length < 3}>{t("rqSend")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rqPortalDeclineTitle")}</DialogTitle>
            <DialogDescription>{declining ? `${declining.number} · ${declining.title} · ${money(declining.amount)}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="co-reason">{t("portalCommentRequired")}</Label>
            <Textarea id="co-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeclining(null)}>{t("cancel")}</Button>
            <Button
              disabled={!reason.trim() || decideChange.isPending}
              onClick={() => declining && decideChange.mutate({ clientId, changeOrderId: declining.id, approved: false, reason, by: viewerName }, { onSuccess: () => { setDeclining(null); setReason("") } })}
            >
              {t("rqPortalDecline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
