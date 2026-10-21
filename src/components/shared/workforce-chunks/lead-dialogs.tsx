"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLeadMutations } from "@/hooks/workforce/use-deals"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { DealStage } from "@/types/work-sales"
import type { Client } from "@/types/workforce"

const DROP_REASONS = ["ldReason_budget", "ldReason_competitor", "ldReason_noAnswer", "ldReason_notFit"] as const

/** Turn a lead into a client, with its first deal unless it already has one (CRM step 6). */
export function ConvertDialog({ lead, onClose, hasDeal }: { lead: Client | null; onClose: () => void; hasDeal: boolean }) {
  const t = useTranslations()
  const { convert } = useLeadMutations()
  const workspace = useCurrentWorkspace()
  const [withDeal, setWithDeal] = React.useState(true)
  const [title, setTitle] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [close, setClose] = React.useState(() => addDays(todayIso(), 30))
  const [shown, setShown] = React.useState<Client | null>(null)
  if (lead !== shown) {
    setShown(lead)
    if (lead) {
      setWithDeal(!hasDeal)
      setTitle(t("ldFirstDeal", { name: lead.name }))
      setAmount("")
      setClose(addDays(todayIso(), 30))
    }
  }
  const valid = !withDeal || (!!title.trim() && Number(amount) >= 0 && amount !== "" && !!close)
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!lead || !valid) return
            const contact = lead.contacts.find((x) => x.isPrimary)
            convert.mutate(
              { id: lead.id, deal: withDeal ? { title, amount: Number(amount), stage: DealStage.QUALIFIED, expectedClose: close, ownerId: lead.accountManagerId, contactId: contact?.id } : undefined },
              { onSuccess: onClose }
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("ldConvertTitle", { name: lead?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("ldConvertHint")}</DialogDescription>
          </DialogHeader>
          {hasDeal && <p className="rounded-2xl bg-info-soft px-3 py-2 text-sm text-info-foreground">{t("ldHasDeal")}</p>}
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={withDeal} onCheckedChange={(v) => setWithDeal(!!v)} />
            {t("ldWithFirstDeal")}
          </label>
          {withDeal && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ld-deal-title">{t("dealTitle")}</Label>
                <Input id="ld-deal-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ld-deal-amount">{t("dealAmount", { currency: workspace.currency })}</Label>
                <Input id="ld-deal-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ld-deal-close">{t("dealExpectedClose")}</Label>
                <Input id="ld-deal-close" type="date" value={close} onChange={(e) => setClose(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!valid || convert.isPending}>{t("ldConvert")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Drop a lead with the reason, so it counts in the conversion rate (CRM step 6). */
export function DropDialog({ lead, onClose }: { lead: Client | null; onClose: () => void }) {
  const t = useTranslations()
  const { drop } = useLeadMutations()
  const [reason, setReason] = React.useState("")
  const [shown, setShown] = React.useState<Client | null>(null)
  if (lead !== shown) {
    setShown(lead)
    if (lead) setReason("")
  }
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (lead && reason.trim()) drop.mutate({ id: lead.id, reason }, { onSuccess: onClose })
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("ldDropTitle", { name: lead?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("ldDropHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ld-reason">{t("ldReason")}</Label>
            <Input id="ld-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            <div className="flex flex-wrap gap-2 pt-1">
              {DROP_REASONS.map((key) => (
                <button key={key} type="button" onClick={() => setReason(t(key))} className="h-8 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted">{t(key)}</button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || drop.isPending}>{t("ldDrop")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
