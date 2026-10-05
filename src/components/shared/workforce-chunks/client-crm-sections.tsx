"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  CreditCard,
  FileSignature,
  FileText,
  Folder,
  MessagesSquare,
  Pencil,
  Plus,
  Smartphone,
  Receipt,
  Trash2,
  Warning,
} from "@/components/ui/carbon/icons"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useClientNotes, useContracts, useCrmMutations } from "@/hooks/workforce/use-crm"
import { clientOutstanding, clientTimeline, contractStatus, creditStatus } from "@/lib/workforce/client-relations"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { ClientNoteKind, ContractType, type ClientActivity, type ClientContract, type ContractInput, type ContractStatus } from "@/types/work-crm"
import type { Client, Employee } from "@/types/workforce"
import { formatMoney } from "./workforce-labels"

export const CONTRACT_STATUS_CLASS: Record<ContractStatus, string> = {
  upcoming: "bg-info-soft text-info-foreground border-transparent",
  active: "bg-success-soft text-success-foreground border-transparent",
  renewal_due: "bg-warning-soft text-warning-foreground border-transparent",
  ended: "bg-muted text-muted-foreground border-transparent",
}

function SectionShell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  )
}

/** Open balance against the credit limit, and whether reminders go out (CRM-8, BIL-15). */
export function ClientBalanceSection({ client, currency }: { client: Client; currency: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: invoices = [] } = useClientInvoices()
  const outstanding = clientOutstanding(client.id, invoices)
  const credit = creditStatus(client, outstanding)
  return (
    <SectionShell title={t("balance")}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{t("outstanding")}</span>
        <span className={cn("text-lg font-semibold tabular-nums", credit.over && "text-destructive")}>{formatMoney(outstanding, currency, locale)}</span>
      </div>
      {credit.limit ? (
        <div>
          <Progress value={credit.ratio * 100} aria-label={t("creditLimit")} className={cn("h-2", credit.over && "[&>div]:bg-destructive")} />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {credit.over && <Warning className="size-3.5 text-destructive" />}
            {credit.over ? t("creditLimitExceeded", { limit: formatMoney(credit.limit, currency, locale) }) : t("creditLimitOf", { limit: formatMoney(credit.limit, currency, locale) })}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noCreditLimit")}</p>
      )}
      <p className="text-xs text-muted-foreground">{client.remindersOff ? t("remindersOffForClient") : t("remindersOnForClient")}</p>
    </SectionShell>
  )
}

const emptyContract = (client: Client, currency: string): ContractInput => ({
  clientId: client.id,
  title: "",
  type: ContractType.TIME_MATERIALS,
  startDate: todayIso(),
  currency: client.currency ?? currency,
})

/** Contracts signed with the client, with renewal warnings (CRM-4). */
export function ClientContractsSection({ client, currency }: { client: Client; currency: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: all = [] } = useContracts()
  const { saveContract, deleteContract } = useCrmMutations()
  const [editing, setEditing] = useState<{ id?: string; input: ContractInput } | null>(null)
  const today = todayIso()
  const contracts = all.filter((c) => c.clientId === client.id).sort((a, b) => b.startDate.localeCompare(a.startDate))
  const date = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`)) : "—")

  const open = (c?: ClientContract) =>
    setEditing(c ? { id: c.id, input: { clientId: c.clientId, title: c.title, type: c.type, startDate: c.startDate, endDate: c.endDate, value: c.value, currency: c.currency, renewalDate: c.renewalDate, fileName: c.fileName, notes: c.notes } } : { input: emptyContract(client, currency) })
  const set = (patch: Partial<ContractInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))

  return (
    <SectionShell
      title={t("contractsTitle")}
      action={
        <Button variant="ghost" size="sm" onClick={() => open()}>
          <Plus className="size-4" /> {t("addContract")}
        </Button>
      }
    >
      {contracts.length === 0 && <p className="text-sm text-muted-foreground">{t("noContracts")}</p>}
      {contracts.map((c) => {
        const status = contractStatus(c, today)
        return (
          <div key={c.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {t(`contract_${c.type}`)} · {date(c.startDate)} → {c.endDate ? date(c.endDate) : t("openEnded")}
                {c.value ? ` · ${formatMoney(c.value, c.currency, locale)}` : ""}
              </p>
              {c.renewalDate && <p className="text-xs text-muted-foreground">{t("renewalOn", { date: date(c.renewalDate) })}</p>}
              {c.fileName && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="size-3.5" /> {c.fileName}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge variant="outline" className={CONTRACT_STATUS_CLASS[status]}>{t(`contractStatus_${status}`)}</Badge>
              <Button variant="ghost" size="icon" className="size-7" aria-label={t("edit")} onClick={() => open(c)}>
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("editContract") : t("addContract")}</DialogTitle>
            <DialogDescription>{client.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-title">{t("title")}</Label>
                <Input id="ct-title" value={editing.input.title} onChange={(e) => set({ title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("type")}</Label>
                  <Select value={editing.input.type} onValueChange={(v) => set({ type: v as ContractType })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue>{t(`contract_${editing.input.type}`)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {Object.values(ContractType).map((v) => <SelectItem key={v} value={v}>{t(`contract_${v}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-value">{`${t("contractValue")} (${editing.input.currency})`}</Label>
                  <Input id="ct-value" type="number" min={0} placeholder={t("optional")} value={editing.input.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-start">{t("startDate")}</Label>
                  <Input id="ct-start" type="date" value={editing.input.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-end">{t("endDate")}</Label>
                  <Input id="ct-end" type="date" min={editing.input.startDate} value={editing.input.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || undefined })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ct-renew">{t("renewalDate")}</Label>
                  <Input id="ct-renew" type="date" value={editing.input.renewalDate ?? ""} onChange={(e) => set({ renewalDate: e.target.value || undefined })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-file">{t("signedFile")}</Label>
                <Input id="ct-file" type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={(e) => set({ fileName: e.target.files?.[0]?.name ?? editing.input.fileName })} />
                {editing.input.fileName && <p className="text-xs text-muted-foreground">{editing.input.fileName}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-notes">{t("notes")}</Label>
                <Textarea id="ct-notes" rows={2} value={editing.input.notes ?? ""} onChange={(e) => set({ notes: e.target.value || undefined })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editing?.id && (
              <Button variant="ghost" className="me-auto text-destructive" onClick={() => deleteContract.mutate(editing.id!, { onSuccess: () => setEditing(null) })}>
                <Trash2 className="size-4" /> {t("delete")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
            <Button disabled={saveContract.isPending} onClick={() => editing && saveContract.mutate({ input: editing.input, id: editing.id }, { onSuccess: () => setEditing(null) })}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  )
}

const ACTIVITY_ICON: Record<ClientActivity["kind"], typeof Calendar> = {
  project: Folder,
  quote: FileText,
  invoice: Receipt,
  payment: CreditCard,
  contract: FileSignature,
  [ClientNoteKind.NOTE]: MessagesSquare,
  [ClientNoteKind.MEETING]: Calendar,
  [ClientNoteKind.CALL]: Smartphone,
}

/** Everything that happened with the client, newest first, plus notes and meetings (CRM-7). */
export function ClientActivitySection({ client, employees }: { client: Client; employees: Employee[] }) {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const { data: projects = [] } = useProjects()
  const { data: quotes = [] } = useQuotes()
  const { data: invoices = [] } = useClientInvoices()
  const { data: contracts = [] } = useContracts()
  const { data: notes = [] } = useClientNotes()
  const { addNote, deleteNote } = useCrmMutations()
  const [kind, setKind] = useState<ClientNoteKind>(ClientNoteKind.NOTE)
  const [text, setText] = useState("")
  const [showAll, setShowAll] = useState(false)
  const timeline = clientTimeline({ clientId: client.id, projects, quotes, invoices, contracts, notes })
  const shown = showAll ? timeline : timeline.slice(0, 8)
  const me = employees.find((e) => e.email === authedUser?.email)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))

  const detail = (a: ClientActivity) => {
    if (!a.detail) return undefined
    if (a.kind === "contract") return t(`contract_${a.detail}`)
    if (a.kind === "quote") return a.detail
    return t.has(a.detail) ? t(a.detail) : a.detail
  }

  return (
    <SectionShell title={t("activity")}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1" role="tablist" aria-label={t("noteType")}>
          {Object.values(ClientNoteKind).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={cn("rounded-full px-2.5 py-0.5 text-xs", kind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {t(`noteKind_${k}`)}
            </button>
          ))}
        </div>
        <Textarea rows={2} placeholder={t("notePlaceholder")} value={text} onChange={(e) => setText(e.target.value)} aria-label={t("notePlaceholder")} />
        <Button
          size="sm"
          className="self-end"
          disabled={!text.trim() || addNote.isPending}
          onClick={() => addNote.mutate({ clientId: client.id, kind, date: todayIso(), text, authorId: me?.id }, { onSuccess: () => setText("") })}
        >
          {t("addNote")}
        </Button>
      </div>
      {timeline.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
      ) : (
        <ol className="relative flex flex-col gap-3 border-s border-border ps-4">
          {shown.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind]
            const noteId = a.id.startsWith("n-") ? a.id.slice(2) : undefined
            const author = noteId ? employees.find((e) => e.id === notes.find((n) => n.id === noteId)?.authorId) : undefined
            return (
              <li key={a.id} className="relative text-sm">
                <span className="absolute -start-[25px] top-0.5 flex size-[18px] items-center justify-center rounded-full border border-border bg-card">
                  <Icon className="size-3 text-muted-foreground" />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("text-foreground", noteId ? "whitespace-pre-line" : "truncate font-medium")}>{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`activity_${a.kind}`)} · {date(a.date)}
                      {detail(a) ? ` · ${detail(a)}` : ""}
                      {author ? ` · ${author.name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.amount !== undefined && <span className="text-xs tabular-nums">{formatMoney(a.amount, a.currency ?? "EUR", locale)}</span>}
                    {noteId && (
                      <Button variant="ghost" size="icon" className="size-6" aria-label={t("delete")} onClick={() => deleteNote.mutate(noteId)}>
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {timeline.length > 8 && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t("showLess") : t("showAllCount", { count: timeline.length })}
        </Button>
      )}
    </SectionShell>
  )
}
