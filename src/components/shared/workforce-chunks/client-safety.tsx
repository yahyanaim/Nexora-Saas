"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeftRight, Pencil, Plus, RotateCcw, Trash2 } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { useClientHistory, useClientSafety, useDeletedClients } from "@/hooks/workforce/use-client-safety"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useDeals } from "@/hooks/workforce/use-deals"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { BIN_DAYS, binDaysLeft, mergeClientValues, mergeConflicts, valueText, type HistoryField, type MergeField, type MergePicks } from "@/lib/workforce/client-history"
import { findDuplicateClients } from "@/lib/workforce/client-relations"
import { cn } from "@/lib/utils"
import { ClientType, type Client, type Employee } from "@/types/workforce"
import type { ClientHistoryEntry, ClientHistoryKind } from "@/types/work-crm"
import { CLIENT_STATUS_LABEL, formatMoney } from "./workforce-labels"

/** Label key of each followed field; reused from the client form where it has one. */
const FIELD_LABEL: Record<HistoryField | "contact", string> = {
  name: "name", legalName: "legalName", status: "status", email: "email", phone: "phone", website: "website", address: "address",
  billingAddress: "billingAddress", ice: "iceNumber", taxId: "taxId", clientType: "clientType", country: "country", industry: "industry",
  currency: "invoiceCurrency", language: "invoiceLanguage", hourlyRate: "rate", paymentTermsDays: "paymentTerms", creditLimit: "creditLimit",
  accountManagerId: "accountManager", leadSource: "clLeadSource", tags: "clTags", remindersOff: "csFieldReminders", convertedAt: "csFieldConverted",
  lostReason: "csFieldLostReason", notes: "notes", rateCard: "rateCard", contact: "contact",
}

/** Names a stored value: people, statuses, sources and amounts instead of ids and codes. */
function useValueLabel(employees: Employee[], currency: string) {
  const t = useTranslations()
  const locale = useLocale()
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id
  return (field: string, value: string | undefined): string => {
    if (value === undefined) return "—"
    switch (field) {
      case "status": return t(CLIENT_STATUS_LABEL[value as Client["status"]] ?? value)
      case "accountManagerId": return nameOf(value)
      case "leadSource": return t(`clSource_${value}`)
      case "clientType": return t(value === ClientType.COMPANY ? "clientTypeCompany" : "clientTypeIndividual")
      case "remindersOff": return value === "true" ? t("csRemindersOff") : t("csRemindersOn")
      case "paymentTermsDays": return t("netDays", { days: Number(value) })
      case "hourlyRate": case "creditLimit": return formatMoney(Number(value), currency, locale)
      case "rateCard": return value.replace(/@(emp_[\w]+)/g, (_, id: string) => nameOf(id))
      case "convertedAt": return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
      default: return value
    }
  }
}

const KIND_ICON: Record<ClientHistoryKind, React.ComponentType<{ className?: string }>> = {
  created: Plus, updated: Pencil, deleted: Trash2, restored: RotateCcw, merged: ArrowLeftRight,
}
const KIND_TONE: Record<ClientHistoryKind, string> = {
  created: "bg-success-soft text-success-foreground",
  updated: "bg-info-soft text-info-foreground",
  deleted: "bg-destructive/10 text-destructive",
  restored: "bg-success-soft text-success-foreground",
  merged: "bg-primary/10 text-primary",
}

/** The History tab (CRM step 9): every saved change, field by field, with who and when. */
export function ClientHistorySection({ client, employees, currency }: { client: Client; employees: Employee[]; currency: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: entries = [], isLoading } = useClientHistory(client.id)
  const { data: settings } = useWorkspaceSettings()
  const label = useValueLabel(employees, currency)
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  const fieldName = (field: string) => {
    if (field.startsWith("custom:")) return settings?.customFields?.find((d) => d.id === field.slice(7))?.label ?? t("customFields")
    return t(FIELD_LABEL[field as HistoryField] ?? field)
  }
  // clients made before the history existed still show when they were added
  const rows: ClientHistoryEntry[] = entries.some((e) => e.kind === "created")
    ? entries
    : [...entries, { id: "added", workspaceId: client.workspaceId, clientId: client.id, kind: "created", changes: [], actorId: "", actorName: "", createdAt: client.createdAt, updatedAt: client.createdAt }]

  if (isLoading) return <ListSkeleton />
  return (
    <ol className="relative space-y-4 ps-1" aria-label={t("csHistory")}>
      {rows.map((e, i) => {
        const Icon = KIND_ICON[e.kind]
        return (
          <li key={e.id} className="relative flex gap-3">
            {i < rows.length - 1 && <span aria-hidden className="absolute start-[15px] top-8 bottom-[-16px] w-px bg-border" />}
            <span className={cn("relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full", KIND_TONE[e.kind])} aria-hidden>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm">
                <span className="font-medium">{e.actorName || t("csSomeone")}</span>{" "}
                <span className="text-muted-foreground">
                  {e.kind === "updated" ? t("csDidUpdate", { n: e.changes.length }) : e.kind === "merged" ? t("csDidMerge", { name: e.note ?? "" }) : t(`csDid_${e.kind}`)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground"><time dateTime={e.createdAt}>{when(e.createdAt)}</time></p>
              {e.changes.length > 0 && (
                <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t("csChangesOn", { date: when(e.createdAt) })}</caption>
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("csField")}</th>
                        <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("csBefore")}</th>
                        <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("csAfter")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {e.changes.map((c, j) => (
                        <tr key={`${c.field}-${j}`} className="align-top">
                          <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-start font-medium">{fieldName(c.field)}</th>
                          <td className="px-3 py-1.5 text-muted-foreground">{c.before === undefined ? "—" : <del className="decoration-muted-foreground/60">{label(c.field, c.before)}</del>}</td>
                          <td className="px-3 py-1.5">{label(c.field, c.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The deleted clients bin on the Clients page: restore, or remove for good (CRM step 9). */
export function DeletedClientsSection({ canPurge }: { canPurge: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: deleted = [], isLoading } = useDeletedClients()
  const { restore, purge } = useClientSafety()
  const [purging, setPurging] = React.useState<Client | null>(null)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso))

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5" aria-labelledby="cs-bin-title">
      <h2 id="cs-bin-title" className="text-base font-semibold">{t("csBinTitle")}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("csBinHint", { days: BIN_DAYS })}</p>
      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton />
        ) : deleted.length === 0 ? (
          <EmptyState icon={Trash2} title={t("csBinEmpty")} hint={t("csBinEmptyHint")} />
        ) : (
          <ul className="divide-y divide-border">
            {deleted.map((c) => {
              const left = binDaysLeft(c.deletedAt!)
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{t("csDeletedLine", { date: date(c.deletedAt!), name: c.deletedBy ?? t("csSomeone") })}</p>
                  </div>
                  <Badge variant="outline" className={cn("border-transparent", left <= 7 ? "bg-warning-soft text-warning-foreground" : "bg-muted text-muted-foreground")}>
                    {t("csDaysLeft", { n: left })}
                  </Badge>
                  <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(c.id)} aria-label={t("csRestoreName", { name: c.name })}>
                    <RotateCcw className="size-4" />
                    {t("csRestore")}
                  </Button>
                  {canPurge && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setPurging(c)} aria-label={t("csPurgeName", { name: c.name })}>
                      <Trash2 className="size-4" />
                      {t("csPurge")}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <ConfirmAlertDialog
        open={!!purging}
        onOpenChange={(o) => !o && setPurging(null)}
        title={t("csPurgeTitle")}
        description={t("csPurgeConfirm", { name: purging?.name ?? "" })}
        confirmLabel={t("csPurge")}
        destructive
        isLoading={purge.isPending}
        onConfirm={() => purging && purge.mutate(purging.id, { onSuccess: () => setPurging(null) })}
      />
    </section>
  )
}

/** Shown on a client's page when another client looks like the same company. */
export function DuplicateNotice({ client, clients, canMerge, onMerge }: { client: Client; clients: Client[]; canMerge: boolean; onMerge: (otherId: string) => void }) {
  const t = useTranslations()
  const [first] = findDuplicateClients(clients, client, client.id)
  if (!first) return null
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
      <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{t("csLooksLike", { name: first.client.name, reasons: first.reasons.map((r) => t(`csReason_${r}`)).join(", ") })}</p>
      {canMerge && <Button size="sm" variant="outline" className="bg-card" onClick={() => onMerge(first.client.id)}>{t("csMerge")}</Button>}
    </div>
  )
}

/**
 * Merges another client into this one (CRM step 9): pick the other client,
 * choose which value stays where the two differ, see what moves over.
 * Mounted when opened, so each opening starts fresh.
 */
export function MergeClientsDialog({ client, clients, employees, currency, initialOtherId, onClose }: { client: Client; clients: Client[]; employees: Employee[]; currency: string; initialOtherId?: string; onClose: () => void }) {
  const t = useTranslations()
  const label = useValueLabel(employees, currency)
  const [otherId, setOtherId] = React.useState(initialOtherId ?? "")
  const [picks, setPicks] = React.useState<MergePicks>({})
  const { merge } = useClientSafety()
  const { data: deals = [] } = useDeals()
  const { data: projects = [] } = useProjects()
  const { data: quotes = [] } = useQuotes()
  const { data: invoices = [] } = useClientInvoices()
  const { data: followUps = [] } = useFollowUps()

  const others = React.useMemo(() => {
    const dupes = new Set(findDuplicateClients(clients, client, client.id).map((d) => d.client.id))
    return clients.filter((c) => c.id !== client.id).sort((a, b) => Number(dupes.has(b.id)) - Number(dupes.has(a.id)) || a.name.localeCompare(b.name))
  }, [clients, client])
  const other = clients.find((c) => c.id === otherId)
  const conflicts: MergeField[] = other ? mergeConflicts(client, other) : []
  const moving = other
    ? [
        // contacts already at this client (same e-mail or name) are not added twice
        { key: "contacts", n: (mergeClientValues(client, other).contacts?.length ?? 0) - client.contacts.length },
        { key: "deals", n: deals.filter((d) => d.clientId === other.id).length },
        { key: "projects", n: projects.filter((p) => p.clientId === other.id).length },
        { key: "quotes", n: quotes.filter((q) => q.clientId === other.id).length },
        { key: "invoices", n: invoices.filter((i) => i.clientId === other.id).length },
        { key: "followUps", n: followUps.filter((f) => f.clientId === other.id).length },
      ].filter((m) => m.n > 0)
    : []

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("csMergeTitle", { name: client.name })}</DialogTitle>
          <DialogDescription>{t("csMergeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-other">{t("csMergeWhich")}</Label>
            <Select value={otherId} onValueChange={(v) => { setOtherId(v); setPicks({}) }}>
              <SelectTrigger id="cs-other" className="w-full bg-card"><SelectValue placeholder={t("csMergePick")}>{other?.name}</SelectValue></SelectTrigger>
              <SelectContent>{others.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {other && (
            <>
              {conflicts.length > 0 ? (
                <fieldset className="rounded-2xl border border-border">
                  <legend className="px-2 text-sm font-medium">{t("csMergeChoose")}</legend>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("csField")}</th>
                          <th scope="col" className="px-3 py-1.5 text-start font-medium">{client.name}</th>
                          <th scope="col" className="px-3 py-1.5 text-start font-medium">{other.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {conflicts.map((f) => {
                          const pick = picks[f] ?? "keep"
                          const option = (side: "keep" | "other", value: string | undefined) => (
                            <label className={cn("flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5", pick === side && "bg-primary/10")}>
                              <input type="radio" name={`cs-pick-${f}`} className="mt-1 accent-[var(--primary)]" checked={pick === side} onChange={() => setPicks((p) => ({ ...p, [f]: side }))} />
                              <span className="break-words">{label(f, value)}</span>
                            </label>
                          )
                          return (
                            <tr key={f} className="align-top">
                              <th scope="row" className="whitespace-nowrap px-3 py-2 text-start font-medium">{t(FIELD_LABEL[f])}</th>
                              <td className="px-1 py-1">{option("keep", valueText(f, client[f]))}</td>
                              <td className="px-1 py-1">{option("other", valueText(f, other[f]))}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </fieldset>
              ) : (
                <p className="rounded-2xl border border-border p-3 text-sm text-muted-foreground">{t("csMergeNoConflict")}</p>
              )}
              <div className="rounded-2xl bg-muted/50 p-3 text-sm">
                <p className="font-medium">{t("csMergeMoves", { name: client.name })}</p>
                <p className="mt-1 text-muted-foreground">
                  {moving.length ? moving.map((m) => t(`csMove_${m.key}`, { n: m.n })).join(" · ") : t("csMergeNothing")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{t("csMergeAfter", { name: other.name })}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant="primary"
            disabled={!other || merge.isPending}
            onClick={() => other && merge.mutate({ keepId: client.id, otherId: other.id, picks }, { onSuccess: onClose })}
          >
            <ArrowLeftRight className="size-4" />
            {t("csMergeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

