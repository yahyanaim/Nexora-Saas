"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { quoteDisplayStatus, quoteTotals } from "@/lib/workforce/quotes"
import { todayIso } from "@/lib/workforce/project-metrics"
import { QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "../work-billing-chunks/quotes-page"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Star } from "@/components/ui/carbon/icons"
import type { Client, Employee } from "@/types/workforce"
import { PortalAccessManager } from "../work-portal-chunks/portal-access-manager"
import { FeedbackSection } from "../work-portal-chunks/satisfaction"
import { ClientActivitySection, ClientBalanceSection, ClientContractsSection } from "./client-crm-sections"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, formatMoney } from "./workforce-labels"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { fieldsFor } from "@/lib/workforce/custom-fields"
import { CustomFieldValuesList } from "./custom-fields"

interface Props {
  client: Client | null
  employees: Employee[]
  currency: string
  onOpenChange: (open: boolean) => void
}

/** Client profile: balance, billing details, contacts, contracts, quotes and the activity timeline. */
export function ClientProfileSheet({ client, employees, currency, onOpenChange }: Props) {
  const t = useTranslations()
  const { data: settings } = useWorkspaceSettings()
  const locale = useLocale()
  const { data: allQuotes = [] } = useQuotes()
  const clientQuotes = client ? allQuotes.filter((q) => q.clientId === client.id) : []
  const manager = employees.find((e) => e.id === client?.accountManagerId)

  return (
    <Sheet open={!!client} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {client && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <SpaceAvatar name={client.name} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{client.name}</SheetTitle>
                  <SheetDescription className="truncate">{client.industry || client.email}</SheetDescription>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className={CLIENT_STATUS_CLASS[client.status]}>
                  {t(CLIENT_STATUS_LABEL[client.status])}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <ClientBalanceSection client={client} currency={currency} />

              <Section title={t("billing")}>
                <Row label={t("billingEmail")} value={client.email} />
                {client.legalName && <Row label={t("legalName")} value={client.legalName} />}
                {client.ice && <Row label={t("iceNumber")} value={<span className="font-mono">{client.ice}</span>} />}
                <Row label={t("taxId")} value={client.taxId || "—"} />
                <Row label={t("address")} value={client.address || "—"} />
                {client.billingAddress && <Row label={t("billingAddress")} value={client.billingAddress} />}
                {client.currency && <Row label={t("invoiceCurrency")} value={client.currency} />}
                <Row
                  label={t("rate")}
                  value={client.hourlyRate ? `${formatMoney(client.hourlyRate, currency)}/h` : t("standardRates")}
                />
                <Row label={t("paymentTerms")} value={t("netDays", { days: client.paymentTermsDays })} />
                <Row label={t("accountManager")} value={manager?.name ?? "—"} />
                {client.website && (
                  <Row
                    label={t("website")}
                    value={
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-info-foreground hover:underline">
                        {client.website.replace(/^https?:\/\//, "")}
                      </a>
                    }
                  />
                )}
              </Section>

              {(client.rateCard?.length ?? 0) > 0 && (
                <Section title={t("rateCard")}>
                  {client.rateCard!.map((r) => (
                    <Row
                      key={r.id}
                      label={r.employeeId ? (employees.find((e) => e.id === r.employeeId)?.name ?? "—") : (r.jobTitle ?? "—")}
                      value={`${formatMoney(r.rate, client.currency ?? currency)}/h`}
                    />
                  ))}
                </Section>
              )}

              <Section title={t("contacts")}>
                {client.contacts.length === 0 && <p className="text-sm text-muted-foreground">{t("noContactsYet")}</p>}
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start justify-between gap-4 text-sm">
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {contact.name}
                        {contact.isPrimary && <Star className="size-3.5 text-info-foreground" aria-label={t("primaryContact")} />}
                      </span>
                      <span className="text-xs text-muted-foreground">{contact.position || "—"}</span>
                    </span>
                    <span className="flex flex-col items-end text-xs">
                      <a href={`mailto:${contact.email}`} className="text-info-foreground hover:underline">
                        {contact.email}
                      </a>
                      {contact.phone && <span className="text-muted-foreground">{contact.phone}</span>}
                    </span>
                  </div>
                ))}
              </Section>

              {client.contacts.length > 0 && (
                <Section title={t("clientPortal")}>
                  <PortalAccessManager clientId={client.id} />
                </Section>
              )}

              <ClientContractsSection client={client} currency={currency} />
              <FeedbackSection clientId={client.id} />

              <Section title={t("quotes")}>
                {clientQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noQuotes")}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {clientQuotes.slice(0, 6).map((q) => {
                      const s = quoteDisplayStatus(q, todayIso())
                      return (
                        <li key={q.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block font-mono text-xs">{q.number || t("draft")}</span>
                            <span className="block truncate text-xs text-muted-foreground">{q.subject}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="tabular-nums">{formatMoney(quoteTotals(q).net, q.currency, locale)}</span>
                            <Badge variant="outline" className={QUOTE_STATUS_CLASS[s]}>{t(QUOTE_STATUS_LABEL[s])}</Badge>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <Link href="/dashboard/quotes" className="text-sm text-primary hover:underline">{t("manageQuotes")}</Link>
              </Section>

              <ClientActivitySection client={client} employees={employees} />

              {fieldsFor(settings?.customFields, "client").some((d) => client.customFields?.[d.id]) && (
                <Section title={t("customFields")}>
                  <CustomFieldValuesList entity="client" values={client.customFields} />
                </Section>
              )}
              {client.notes && (
                <Section title={t("notes")}>
                  <p className="whitespace-pre-line text-sm">{client.notes}</p>
                </Section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
