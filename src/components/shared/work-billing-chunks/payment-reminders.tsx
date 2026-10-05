"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send } from "@/components/ui/carbon/icons"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useReminderMutations } from "@/hooks/workforce/use-crm"
import { DEFAULT_REMINDERS, daysOverdue, reminderDue } from "@/lib/workforce/client-relations"
import { invoiceBalance } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import type { ClientInvoice } from "@/types/work-billing"
import type { ReminderSettings } from "@/types/work-crm"
import type { Client } from "@/types/workforce"
import { formatMoney } from "../workforce-chunks/workforce-labels"

const LEVEL_CLASS = {
  1: "bg-info-soft text-info-foreground border-transparent",
  2: "bg-warning-soft text-warning-foreground border-transparent",
  3: "bg-destructive/10 text-destructive border-transparent",
} as const

/** Overdue invoices ready for a reminder, the reminder email and its settings (BIL-15). */
export function PaymentReminders({ invoices, clients }: { invoices: ClientInvoice[]; clients: Client[] }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: settingsDoc } = useWorkspaceSettings()
  const settings = settingsDoc?.reminders ?? DEFAULT_REMINDERS
  const { send, saveSettings } = useReminderMutations()
  const [draft, setDraft] = useState<ReminderSettings | null>(null)
  const [preview, setPreview] = useState<{ invoice: ClientInvoice; level: 1 | 2 | 3; to: string; body: string } | null>(null)
  const today = todayIso()
  const company = settingsDoc?.company.tradeName || settingsDoc?.company.legalName || ""
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))

  const clientOf = (id: string) => clients.find((c) => c.id === id)
  const ready = invoices
    .map((invoice) => ({ invoice, level: reminderDue(invoice, invoices, today, settings, clientOf(invoice.clientId)) }))
    .filter((r): r is { invoice: ClientInvoice; level: 1 | 2 | 3 } => r.level !== null)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate))
  const history = invoices
    .flatMap((i) => (i.reminders ?? []).map((r) => ({ ...r, number: i.number, clientId: i.clientId })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)

  const openPreview = (invoice: ClientInvoice, level: 1 | 2 | 3) => {
    const client = clientOf(invoice.clientId)
    const contact = client?.contacts.find((c) => c.isPrimary)
    const values = {
      name: contact?.name ?? client?.name ?? "",
      number: invoice.number,
      amount: formatMoney(invoiceBalance(invoice, invoices), invoice.currency, locale),
      dueDate: date(invoice.dueDate),
      days: daysOverdue(invoice, today),
      company,
    }
    setPreview({ invoice, level, to: contact?.email ?? client?.email ?? "", body: t(`reminderTemplate${level}`, values) })
  }

  const current = draft ?? settings
  const setDay = (i: 0 | 1 | 2, value: number) => {
    const days = [...current.days] as ReminderSettings["days"]
    days[i] = value
    setDraft({ ...current, days })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5 xl:col-span-2">
        <h2 className="mb-1 text-base font-semibold">{t("remindersTitle")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{settings.enabled ? t("remindersHint") : t("remindersDisabled")}</p>
        {ready.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("remindersNone")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {ready.map(({ invoice, level }) => (
              <li key={invoice.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{invoice.number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {clientOf(invoice.clientId)?.name} · {t("daysLate", { count: daysOverdue(invoice, today) })}
                  </p>
                </div>
                <span className="font-medium tabular-nums">{formatMoney(invoiceBalance(invoice, invoices), invoice.currency, locale)}</span>
                <Badge variant="outline" className={cn("w-24 justify-center", LEVEL_CLASS[level])}>{t("reminderLevel", { level })}</Badge>
                <Button size="sm" onClick={() => openPreview(invoice, level)}>
                  <Send className="size-4" /> {t("reminderPreview")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("remindersSent")}</h3>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {history.map((h) => (
                <li key={`${h.invoiceId}-${h.level}`}>
                  {date(h.at)} · <span className="font-mono">{h.number}</span> · {t("reminderLevel", { level: h.level })} → {h.to}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("reminderSettings")}</h2>
          <Switch checked={current.enabled} onCheckedChange={(enabled) => setDraft({ ...current, enabled })} aria-label={t("paymentReminders")} />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("reminderSettingsHint")}</p>
        <div className="grid grid-cols-3 gap-2">
          {([0, 1, 2] as const).map((i) => (
            <div key={i} className="grid gap-1.5">
              <Label htmlFor={`rem-${i}`}>{t("reminderLevel", { level: i + 1 })}</Label>
              <Input id={`rem-${i}`} type="number" min={1} max={365} disabled={!current.enabled} value={current.days[i]} onChange={(e) => setDay(i, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("reminderDaysHint")}</p>
        <Button className="mt-4 w-full" disabled={!draft || saveSettings.isPending} onClick={() => draft && saveSettings.mutate(draft, { onSuccess: () => setDraft(null) })}>
          {t("save")}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">{t("reminderClientHint")}</p>
      </section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview ? t("reminderDialogTitle", { level: preview.level, number: preview.invoice.number }) : ""}</DialogTitle>
            <DialogDescription>{t("reminderDialogHint")}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rem-to">{t("to")}</Label>
                <Input id="rem-to" value={preview.to} readOnly />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rem-body">{t("message")}</Label>
                <Textarea id="rem-body" rows={9} value={preview.body} onChange={(e) => setPreview({ ...preview, body: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>{t("cancel")}</Button>
            <Button
              disabled={send.isPending}
              onClick={() => preview && send.mutate({ id: preview.invoice.id, level: preview.level }, { onSuccess: () => setPreview(null) })}
            >
              <Send className="size-4" /> {t("reminderSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
