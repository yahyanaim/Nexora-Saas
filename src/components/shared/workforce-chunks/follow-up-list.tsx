"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, Play, RotateCcw, Trash2 } from "@/components/ui/carbon/icons"
import { DataTableRowActions } from "../data-table-chunks/data-table-row-actions"
import { useFollowUpMutations } from "@/hooks/workforce/use-crm"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useDeals } from "@/hooks/workforce/use-deals"
import { canWorkOn, followUpStatus, followUpWhen, type FollowUpWhen } from "@/lib/workforce/follow-ups"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { FollowUpStatus, type ClientFollowUp } from "@/types/work-crm"
import { clientPageHref } from "./client-page-tabs"
import { relativeDay } from "./clients-columns"

export const WHEN_DOT: Record<FollowUpWhen, string> = {
  late: "bg-destructive",
  today: "bg-warning",
  week: "bg-primary",
  later: "bg-muted-foreground",
  done: "bg-success",
}

export const WHEN_CLASS: Record<FollowUpWhen, string> = {
  late: "bg-danger-soft text-destructive",
  today: "bg-warning-soft text-warning-foreground",
  week: "bg-info-soft text-info-foreground",
  later: "bg-muted text-muted-foreground",
  done: "bg-success-soft text-success-foreground",
}

interface Props {
  items: ClientFollowUp[]
  /** Show which client each one is for (off on a client's own page) */
  showClient?: boolean
  /** May plan, change and delete any follow-up (clients:update) */
  canEdit: boolean
  /** May open client pages (clients:read) */
  canOpenClients?: boolean
  onEdit: (f: ClientFollowUp) => void
  empty: React.ReactNode
}

/**
 * Follow-ups as a list (CRM step 5): tick to mark done, when it is due, who
 * does it, the contact and the deal. Owners can work on their own ones
 * without client rights.
 */
export function FollowUpList({ items, showClient = true, canEdit, canOpenClients = true, onEdit, empty }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const me = useCurrentEmployee()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: deals = [] } = useDeals()
  const { setDone, save, remove } = useFollowUpMutations()
  const [deleting, setDeleting] = React.useState<ClientFollowUp | null>(null)
  const today = todayIso()
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))

  if (items.length === 0) return <>{empty}</>

  const setStatus = (f: ClientFollowUp, status: FollowUpStatus) =>
    save.mutate({ id: f.id, input: { clientId: f.clientId, title: f.title, dueDate: f.dueDate, ownerId: f.ownerId, contactId: f.contactId, dealId: f.dealId, note: f.note, status } })

  return (
    <>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
        {items.map((f) => {
          const client = clients.find((c) => c.id === f.clientId)
          const contact = client?.contacts.find((c) => c.id === f.contactId)
          const deal = deals.find((d) => d.id === f.dealId)
          const owner = employees.find((e) => e.id === f.ownerId)
          const when = followUpWhen(f, today)
          const mine = canWorkOn(f, me?.id, canEdit)
          const status = followUpStatus(f)
          return (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                className="mt-0.5"
                checked={!!f.doneAt}
                disabled={!mine || setDone.isPending}
                onCheckedChange={(v) => setDone.mutate({ id: f.id, done: !!v, by: me?.id })}
                aria-label={t(f.doneAt ? "fuMarkOpen" : "fuMarkDone", { title: f.title })}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className={cn("flex flex-wrap items-center gap-1.5 text-sm font-medium", f.doneAt && "text-muted-foreground line-through")}>
                  {f.title}
                  {!f.doneAt && status === FollowUpStatus.IN_PROGRESS && <Badge variant="outline" className="border-transparent bg-primary/10 text-primary">{t("fuStatus_in_progress")}</Badge>}
                </p>
                <p className="flex flex-wrap items-center gap-y-0.5 text-xs text-muted-foreground [&>*+*]:before:mx-1.5 [&>*+*]:before:content-['·']">
                  {showClient && client && (canOpenClients ? <Link href={clientPageHref(client.id, "followups")} className="font-medium text-foreground hover:text-primary hover:underline">{client.name}</Link> : <span className="font-medium text-foreground">{client.name}</span>)}
                  {contact && <span>{t("fuWith", { name: contact.name })}</span>}
                  {deal && <span>{t("fuForDeal", { deal: deal.title })}</span>}
                  <span>{owner ? owner.name : t("fuNobody")}</span>
                </p>
                {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", WHEN_CLASS[when])} title={f.dueDate}>
                {when === "done" ? t("fuDoneOn", { date: date(f.doneAt!) }) : when === "today" ? t("fuToday") : `${date(f.dueDate)} · ${relativeDay(f.dueDate, today, locale)}`}
              </span>
              {mine && (
                <DataTableRowActions
                  row={f}
                  actions={[
                    ...(!f.doneAt && canEdit ? [{ label: t("edit"), icon: Pencil, onClick: onEdit }] : []),
                    ...(!f.doneAt && status === FollowUpStatus.TODO ? [{ label: t("fuStart"), icon: Play, onClick: (x: ClientFollowUp) => setStatus(x, FollowUpStatus.IN_PROGRESS) }] : []),
                    ...(!f.doneAt && status === FollowUpStatus.IN_PROGRESS ? [{ label: t("fuBackToTodo"), icon: RotateCcw, onClick: (x: ClientFollowUp) => setStatus(x, FollowUpStatus.TODO) }] : []),
                    ...(canEdit ? [{ label: t("delete"), icon: Trash2, onClick: setDeleting, variant: "destructive" as const, separatorBefore: true }] : []),
                  ]}
                />
              )}
            </li>
          )
        })}
      </ul>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("fuDeleteTitle")}</DialogTitle>
            <DialogDescription>{deleting?.title}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>{t("delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
