"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, CreditCard, DownloadIcon, FileText, KeyRound } from "@/components/ui/carbon/icons"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCompanySubscriptionMutations } from "@/hooks/platform/use-platform-billing"
import { useNxDocuments } from "@/hooks/platform/use-nx-documents"
import { listInvoicesApi, listPlanVersionsApi, listSubscriptionsApi } from "@/lib/api/platform-billing-api"
import { can } from "@/lib/permissions/can"
import { periodPrice, versionOn } from "@/lib/platform/billing"
import { seatLimit } from "@/lib/platform/customer-lifecycle"
import { NEXORA_PLANS, formatMad, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { cn } from "@/lib/utils"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import type { CustomerAccount } from "@/types/platform-customers"
import { InvoiceStatusBadge } from "@/components/shared/platform-chunks/billing-shared"
import { CompanyDataSection } from "./company-data-section"

/**
 * My subscription for a company that Nexora bills (INV-07, PLA-02, SUB-01):
 * the same plan, features, seats, period, payment method and invoices as the
 * console, with the same rules for changes.
 */
export function NexoraSubscriptionView({ customer, used }: { customer: CustomerAccount; used: number }) {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const isAdmin = can(authedUser, P.ROLES_READ)
  const docs = useNxDocuments()
  const m = useCompanySubscriptionMutations()
  const { data: subs = [] } = useQuery({ queryKey: ["platform", "billing", "subscriptions"], queryFn: listSubscriptionsApi })
  const { data: versions = [] } = useQuery({ queryKey: ["platform", "billing", "versions"], queryFn: listPlanVersionsApi })
  const { data: allInvoices = [] } = useQuery({ queryKey: ["platform", "billing", "invoices"], queryFn: listInvoicesApi })
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const sub = subs.find((s) => s.customerId === customer.id)
  const invoices = allInvoices.filter((i) => i.customerId === customer.id)
  const money = (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA")
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const plan = planById(customer.plan)
  const limit = seatLimit(customer, today)
  const billing = sub?.billing ?? customer.billing
  const priceOf = (id: NexoraPlanId) => versionOn(versions, id, today)?.monthly ?? planById(id).monthly
  const current = sub ? versions.find((v) => v.id === sub.versionId)?.monthly ?? priceOf(customer.plan) : priceOf(customer.plan)
  const busy = m.changePlan.isPending || m.changeBilling.isPending || m.changeMethod.isPending

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-panel lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subCurrentPlan")}</p>
              <p className="mt-1 text-2xl font-semibold">Nexora {plan.name}</p>
              <p className="text-sm text-muted-foreground">
                {money(periodPrice(current, billing))} {t("subExclVat")} / {t(billing === "yearly" ? "subYear" : "subMonth")}
                {sub && ` · ${t("subRenews", { date: date(sub.periodEnd) })}`}
              </p>
              {sub?.scheduledPlan && <p className="mt-1 text-xs text-warning-foreground">{t("subWillBecome", { plan: planById(sub.scheduledPlan).name, date: date(sub.periodEnd) })}</p>}
              {sub?.scheduledBilling && <p className="mt-1 text-xs text-warning-foreground">{t("subWillBillMonthly", { date: date(sub.periodEnd) })}</p>}
              {sub?.discount && <p className="mt-1 text-xs text-success-foreground">{t("subDiscountShown", { value: sub.discount.kind === "percent" ? `${sub.discount.value}%` : money(sub.discount.value), reason: sub.discount.reason })}</p>}
            </div>
            <Badge variant="outline" className="border-transparent bg-success-soft text-success-foreground">{t(`lcStatus_${customer.status}`)}</Badge>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium"><KeyRound className="size-4" /> {t("subSeats")}</span>
              <span className="tabular-nums text-muted-foreground">{limit === null ? t("subSeatsUnlimited", { used }) : t("subSeatsUsed", { used, total: limit })}</span>
            </div>
            <Progress value={limit === null ? 10 : Math.min(100, (used / limit) * 100)} aria-label={t("subSeats")} className={cn("h-2", limit !== null && used >= limit && "[&>div]:bg-warning")} />
            {limit !== null && used >= limit && <p className="mt-1 text-xs text-warning-foreground">{t("subSeatsFull")}</p>}
            {sub?.extension && sub.extension.until >= today && <p className="mt-1 text-xs text-muted-foreground">{t("subExtraShown", { n: sub.extension.seats, date: date(sub.extension.until) })}</p>}
            <Link href="/dashboard/access" className="mt-2 inline-block text-sm text-primary hover:underline">{t("subManageAccess")}</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subPayment")}</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4" /> {sub ? t(sub.method === "card" ? "subCard" : "subTransfer") : "—"}</p>
          {sub && isAdmin && (
            <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => m.changeMethod.mutate({ customerId: customer.id, method: sub.method === "card" ? "transfer" : "card" })}>
              {t(sub.method === "card" ? "subSwitchToTransfer" : "subSwitchToCard")}
            </Button>
          )}
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subMemberSince")}</p>
          <p className="mt-1 text-sm">{date(customer.since)}</p>
          {sub && isAdmin && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subBilling")}</p>
              <p className="mt-1 text-sm">{t(billing === "yearly" ? "pfYearly" : "pfMonthly")}</p>
              {billing === "monthly"
                ? <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => m.changeBilling.mutate({ customerId: customer.id, billing: "yearly" })}>{t("subToYearly")}</Button>
                : !sub.scheduledBilling && <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => m.changeBilling.mutate({ customerId: customer.id, billing: "monthly" })}>{t("subToMonthly")}</Button>}
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("subPlans")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("subPlansSameAsNexora")}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {NEXORA_PLANS.filter((p) => !p.retired || p.id === customer.plan).map((p) => {
            const isCurrent = p.id === customer.plan
            const tooSmall = p.seats > 0 && used > p.seats
            const up = priceOf(p.id) > current
            return (
              <div key={p.id} className={cn("flex flex-col rounded-2xl border p-4", isCurrent ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-semibold">{money(periodPrice(priceOf(p.id), billing))}<span className="text-sm font-normal text-muted-foreground"> / {t(billing === "yearly" ? "subYear" : "subMonth")}</span></p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle className="mt-0.5 size-4 shrink-0 text-success-foreground" />{f}</li>)}
                </ul>
                {isAdmin && sub && (
                  <Button className="mt-4" variant={isCurrent ? "outline" : up ? "primary" : "outline"} disabled={isCurrent || (!up && tooSmall) || busy} onClick={() => m.changePlan.mutate({ customerId: customer.id, plan: p.id })}>
                    {isCurrent ? t("subCurrent") : !up && tooSmall ? t("subTooSmall") : up ? t("subUpgrade") : t("subDowngrade")}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("subChangeRules")}</p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("subInvoices")}</h2>
        {invoices.length === 0 ? <p className="text-sm text-muted-foreground">{t("pfNoInvoices")}</p> : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="w-36 font-mono text-xs">{inv.number}</span>
                <span className="flex-1 text-muted-foreground">{date(inv.date)} · {date(inv.periodFrom)} → {date(inv.periodTo)}</span>
                <span className="font-medium tabular-nums">{money(inv.total)}</span>
                <InvoiceStatusBadge status={inv.status} />
                <Button variant="ghost" size="sm" aria-label={t("biDownloadPdfOf", { number: inv.number })} onClick={() => void docs.invoicePdf(inv)}><FileText className="size-4" />PDF</Button>
                <Button variant="ghost" size="sm" aria-label={t("biDownloadXmlOf", { number: inv.number })} onClick={() => void docs.invoiceXml(inv)}><DownloadIcon className="size-4" />XML</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && <CompanyDataSection customer={customer} />}
    </div>
  )
}
