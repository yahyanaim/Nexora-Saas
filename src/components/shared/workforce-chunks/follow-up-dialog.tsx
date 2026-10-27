"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFollowUpMutations } from "@/hooks/workforce/use-crm"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useDeals } from "@/hooks/workforce/use-deals"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { FollowUpStatus, type ClientFollowUp, type FollowUpInput } from "@/types/work-crm"
import { isOpenDeal } from "@/lib/workforce/deals"
import { ClientStatus, EmployeeStatus } from "@/types/workforce"

const NONE = "none"

/** What the dialog starts with when planning a new follow-up from a client, a deal or a call. */
export interface FollowUpDefaults {
  clientId?: string
  dealId?: string
  contactId?: string
  title?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The follow-up to change; a new one when absent */
  followUp?: ClientFollowUp | null
  defaults?: FollowUpDefaults
  /** Planned from a client's page or panel: the client can't be changed */
  lockClient?: boolean
}

/**
 * Plan or change a follow-up (CRM step 5): what to do, by when, who does it,
 * and which contact and deal it concerns.
 */
export function FollowUpDialog({ open, onOpenChange, followUp, defaults, lockClient }: Props) {
  const t = useTranslations()
  const me = useCurrentEmployee()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: deals = [] } = useDeals()
  const { save } = useFollowUpMutations()
  const today = todayIso()

  const blank = React.useCallback(
    (): FollowUpInput => ({ clientId: defaults?.clientId ?? "", title: defaults?.title ?? "", dueDate: addDays(today, 1), ownerId: me?.id, contactId: defaults?.contactId, dealId: defaults?.dealId, status: FollowUpStatus.TODO }),
    [defaults?.clientId, defaults?.title, defaults?.contactId, defaults?.dealId, today, me?.id]
  )
  const [draft, setDraft] = React.useState<FollowUpInput>(blank)
  // start again from the follow-up or the defaults each time the dialog opens
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(followUp ? { clientId: followUp.clientId, title: followUp.title, dueDate: followUp.dueDate, ownerId: followUp.ownerId, contactId: followUp.contactId, dealId: followUp.dealId, status: followUp.status ?? FollowUpStatus.TODO, note: followUp.note } : blank())
  }
  const set = (patch: Partial<FollowUpInput>) => setDraft((d) => ({ ...d, ...patch }))

  const client = clients.find((c) => c.id === draft.clientId)
  const clientChoices = clients.filter((c) => c.status !== ClientStatus.ARCHIVED || c.id === draft.clientId)
  const dealChoices = deals.filter((d) => d.clientId === draft.clientId && (isOpenDeal(d) || d.id === draft.dealId))
  const people = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE || e.id === draft.ownerId)
  const valid = !!draft.clientId && !!draft.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)
  const quick = [
    { label: t("fuToday"), date: today },
    { label: t("fuTomorrow"), date: addDays(today, 1) },
    { label: t("fuInDays", { n: 3 }), date: addDays(today, 3) },
    { label: t("fuNextWeek"), date: addDays(today, 7) },
  ]

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    save.mutate({ input: draft, id: followUp?.id }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{followUp ? t("fuEdit") : t("fuPlan")}</DialogTitle>
            <DialogDescription>{lockClient && client ? t("fuPlanFor", { name: client.name }) : t("fuPlanHint")}</DialogDescription>
          </DialogHeader>

          {!lockClient && (
            <div className="space-y-1.5">
              <Label htmlFor="fu-client">{t("client")}</Label>
              <Select value={draft.clientId || undefined} onValueChange={(v) => set({ clientId: v, contactId: undefined, dealId: undefined })}>
                <SelectTrigger id="fu-client"><SelectValue placeholder={t("fuPickClient")}>{client?.name}</SelectValue></SelectTrigger>
                <SelectContent>
                  {clientChoices.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fu-title">{t("fuWhat")}</Label>
            <Input id="fu-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("fuWhatPlaceholder")} autoFocus required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fu-date">{t("fuDue")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input id="fu-date" type="date" className="w-44" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} required />
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  aria-pressed={draft.dueDate === q.date}
                  onClick={() => set({ dueDate: q.date })}
                  className={cn("h-8 rounded-full border px-3 text-xs font-medium", draft.dueDate === q.date ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fu-owner">{t("fuOwner")}</Label>
              <Select value={draft.ownerId ?? NONE} onValueChange={(v) => set({ ownerId: v === NONE ? undefined : v })}>
                <SelectTrigger id="fu-owner"><SelectValue>{people.find((e) => e.id === draft.ownerId)?.name ?? t("fuNobody")}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("fuNobody")}</SelectItem>
                  {people.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-status">{t("status")}</Label>
              <Select value={draft.status ?? FollowUpStatus.TODO} onValueChange={(v) => set({ status: v as FollowUpStatus })}>
                <SelectTrigger id="fu-status"><SelectValue>{t(`fuStatus_${draft.status ?? FollowUpStatus.TODO}`)}</SelectValue></SelectTrigger>
                <SelectContent>
                  {Object.values(FollowUpStatus).map((s) => <SelectItem key={s} value={s}>{t(`fuStatus_${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-contact">{t("fuContact")}</Label>
              <Select value={draft.contactId ?? NONE} onValueChange={(v) => set({ contactId: v === NONE ? undefined : v })}>
                <SelectTrigger id="fu-contact" disabled={!client}><SelectValue>{client?.contacts.find((c) => c.id === draft.contactId)?.name ?? "—"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {client?.contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-deal">{t("fuDeal")}</Label>
              <Select value={draft.dealId ?? NONE} onValueChange={(v) => set({ dealId: v === NONE ? undefined : v })}>
                <SelectTrigger id="fu-deal" disabled={!client}><SelectValue>{dealChoices.find((d) => d.id === draft.dealId)?.title ?? "—"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {dealChoices.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fu-note">{t("fuNote")}</Label>
            <Textarea id="fu-note" rows={2} value={draft.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={!valid || save.isPending}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
