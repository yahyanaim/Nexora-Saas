"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Pencil, Plus, Star, Trash2 } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link } from "@/i18n/navigation"
import { displayStatus, invoiceTotals } from "@/lib/workforce/billing"
import { dealProbability } from "@/lib/workforce/deals"
import { usePipeline } from "@/hooks/workforce/use-pipeline"
import { quoteDisplayStatus, quoteTotals } from "@/lib/workforce/quotes"
import { todayIso } from "@/lib/workforce/project-metrics"
import { contactEmails, contactPhones } from "@/lib/workforce/leads"
import { cn } from "@/lib/utils"
import type { ClientInvoice } from "@/types/work-billing"
import type { WorkProject } from "@/types/work-projects"
import type { Quote } from "@/types/work-quotes"
import type { Deal } from "@/types/work-sales"
import type { Client, ClientContact, Employee } from "@/types/workforce"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL } from "../work-billing-chunks/billing-labels"
import { QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "../work-billing-chunks/quotes-page"
import { PROJECT_STATUS_CLASS, PROJECT_STATUS_LABEL } from "../work-projects-chunks/project-labels"
import { formatMoney } from "./workforce-labels"
import { blankContact, ContactDialog, withContact, withoutContact } from "./contact-edit"

/** A titled card on the client page. */
export function PageSection({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium text-foreground">{value}</span>
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{children}</p>

// ---------- Contacts, edited in place ----------

/**
 * The client's contacts with their role, added, changed and removed right
 * here; saving goes through the client's own update, so the rules (one main
 * contact) stay in one place.
 */
export function ContactsSection({ client, canEdit, onSave, saving }: { client: Client; canEdit: boolean; onSave: (contacts: ClientContact[]) => void; saving: boolean }) {
  const t = useTranslations()
  const [editing, setEditing] = React.useState<ClientContact | null>(null)
  const [removing, setRemoving] = React.useState<ClientContact | null>(null)
  return (
    <PageSection
      title={t("contacts")}
      action={canEdit && <Button size="sm" variant="outline" onClick={() => setEditing(blankContact())}><Plus className="size-4" />{t("cpAddContact")}</Button>}
    >
      {client.contacts.length === 0 ? (
        <Empty>{t("noContactsYet")}</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {client.contacts.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <ContactCard contact={c} />
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(c)} aria-label={t("cpEditContact", { name: c.name })}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setRemoving(c)} aria-label={t("cpRemoveContact", { name: c.name })}><Trash2 className="size-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ContactDialog
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(contact) => {
          onSave(withContact(client.contacts, contact))
          setEditing(null)
        }}
        saving={saving}
      />

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cpRemoveContact", { name: removing?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("cpRemoveContactHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>{t("cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removing) onSave(withoutContact(client.contacts, removing.id))
                setRemoving(null)
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageSection>
  )
}

/** Who a contact is and every way to reach them. */
export function ContactCard({ contact: c, client }: { contact: ClientContact; client?: React.ReactNode }) {
  const t = useTranslations()
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="flex flex-wrap items-center gap-1.5 font-medium">
        {c.name}
        {c.isPrimary && <Badge variant="outline" className="border-transparent bg-info-soft text-info-foreground"><Star className="size-3" aria-hidden />{t("primaryContact")}</Badge>}
        {c.role && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t(`ctRole_${c.role}`)}</Badge>}
      </p>
      {(c.position || client) && <p className="text-xs text-muted-foreground">{[c.position, client].filter(Boolean).reduce<React.ReactNode[]>((acc, x, i) => (i ? [...acc, " · ", x] : [x]), [])}</p>}
      <p className="flex flex-col text-sm">
        {contactEmails(c).map((email) => <a key={email} href={`mailto:${email}`} className="truncate text-primary hover:underline">{email}</a>)}
        {contactPhones(c).map((phone) => <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`} className="tabular-nums text-muted-foreground hover:text-foreground" dir="ltr">{phone}</a>)}
        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="truncate text-muted-foreground hover:text-foreground hover:underline">LinkedIn</a>}
      </p>
    </div>
  )
}

// ---------- Deals ----------

export function DealsSection({ deals, employees, currency, contacts = [] }: { deals: Deal[]; employees: Employee[]; currency: string; contacts?: ClientContact[] }) {
  const { pipeline, stageLabel } = usePipeline()
  const t = useTranslations()
  const locale = useLocale()
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const sorted = [...deals].sort((a, b) => b.expectedClose.localeCompare(a.expectedClose))
  return (
    <PageSection title={t("cpDeals")} action={<Link href="/dashboard/deals" className="text-sm text-primary hover:underline">{t("cpOpenPipeline")}</Link>}>
      {sorted.length === 0 ? (
        <Empty>{t("cpNoDeals")}</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {sorted.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("cpExpectedClose", { date: date(d.expectedClose) })}
                  {d.ownerId && ` · ${employees.find((e) => e.id === d.ownerId)?.name ?? ""}`}
                  {d.contactId && contacts.find((c) => c.id === d.contactId) && ` · ${t("fuWith", { name: contacts.find((c) => c.id === d.contactId)!.name })}`}
                </span>
              </span>
              <span className="tabular-nums font-medium">{formatMoney(d.amount, currency, locale)}</span>
              <span className="w-12 text-end text-xs tabular-nums text-muted-foreground">{dealProbability(d, pipeline)}%</span>
              <Badge variant="outline" className="border-transparent bg-muted text-foreground">{stageLabel(d.stage)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  )
}

// ---------- Quotes and invoices ----------

export function QuotesInvoicesSection({ quotes, invoices, allInvoices, currency }: { quotes: Quote[]; invoices: ClientInvoice[]; allInvoices: ClientInvoice[]; currency: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const issued = [...invoices].filter((i) => i.number).sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PageSection title={t("cpInvoices")} action={<Link href="/dashboard/client-invoices" className="text-sm text-primary hover:underline">{t("cpAllInvoices")}</Link>}>
        {issued.length === 0 ? (
          <Empty>{t("cpNoInvoices")}</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {issued.map((inv) => {
              const s = displayStatus(inv, today, allInvoices)
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs">{inv.number}</span>
                    <span className="block text-xs text-muted-foreground">{t("cpIssuedDue", { issued: date(inv.issueDate), due: date(inv.dueDate) })}</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(invoiceTotals(inv).total, inv.currency || currency, locale)}</span>
                  <Badge variant="outline" className={INVOICE_STATUS_CLASS[s]}>{t(INVOICE_STATUS_LABEL[s])}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </PageSection>
      <PageSection title={t("quotes")} action={<Link href="/dashboard/quotes" className="text-sm text-primary hover:underline">{t("manageQuotes")}</Link>}>
        {quotes.length === 0 ? (
          <Empty>{t("noQuotes")}</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {[...quotes].sort((a, b) => b.issueDate.localeCompare(a.issueDate)).map((q) => {
              const s = quoteDisplayStatus(q, today)
              return (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs">{q.number || t("draft")}</span>
                    <span className="block truncate text-xs text-muted-foreground">{q.subject}</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(quoteTotals(q).net, q.currency || currency, locale)}</span>
                  <Badge variant="outline" className={QUOTE_STATUS_CLASS[s]}>{t(QUOTE_STATUS_LABEL[s])}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </PageSection>
    </div>
  )
}

// ---------- Projects ----------

export function ProjectsSection({ projects, stats }: { projects: WorkProject[]; stats: Map<string, { progress: number }> }) {
  const t = useTranslations()
  const locale = useLocale()
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  return (
    <PageSection title={t("projects")}>
      {projects.length === 0 ? (
        <Empty>{t("cpNoProjects")}</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const progress = stats.get(p.id)?.progress ?? 0
            return (
              <li key={p.id}>
                <Link href={`/dashboard/projects/${p.id}`} className="block space-y-2 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <Badge variant="outline" className={PROJECT_STATUS_CLASS[p.status]}>{t(PROJECT_STATUS_LABEL[p.status])}</Badge>
                  </span>
                  <Progress value={progress} aria-label={t("cpProgressOf", { name: p.name })} className="h-1.5" />
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">{t("cpProgress", { n: Math.round(progress) })}</span>
                    {p.dueDate && <span>{t("cpDue", { date: date(p.dueDate) })}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </PageSection>
  )
}
