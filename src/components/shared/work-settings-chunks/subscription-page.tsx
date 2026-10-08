"use client"

import { NEXORA_CURRENCY } from "@/lib/platform/nexora-catalog"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ListSkeleton } from "@/components/ui/empty-state"
import { CheckCircle, CreditCard, DownloadIcon, KeyRound } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { listAccountsApi } from "@/lib/api/access-api"
import { ERP_PLANS, changeWorkspacePlanApi, getWorkspaceSubscriptionApi, listSubscriptionInvoicesApi, planPrice } from "@/lib/api/workspace-subscription-api"
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf"
import { seatsUsed } from "@/lib/workforce/access"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { InvoiceMethod, InvoiceStatus, type Invoice } from "@/types/invoices"
import type { BillingCycle, ErpPlan, SubscriptionInvoice } from "@/types/workspace-subscription"
import { translateError } from "@/lib/errors/translate-error"
import { listCustomersApi } from "@/lib/api/platform-customers-api"
import { NexoraSubscriptionView } from "./nexora-subscription-view"

/** The company's own Nexora subscription: plan, seats, invoices and plan changes (SUB-1…SUB-4). */
export default function SubscriptionPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const ws = workspace.id
  const qc = useQueryClient()
  const { data: settings } = useWorkspaceSettings()
  const { data: sub, isLoading } = useQuery({ queryKey: ["subscription", ws], queryFn: () => getWorkspaceSubscriptionApi(ws) })
  const { data: invoices = [] } = useQuery({ queryKey: ["subscription-invoices", ws], queryFn: () => listSubscriptionInvoicesApi(ws) })
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts", ws], queryFn: () => listAccountsApi(ws) })
  // A company Nexora bills reads the same subscription as the console (INV-07, SUB-01)
  const { data: customers, isLoading: loadingCustomers } = useQuery({ queryKey: ["platform", "customers"], queryFn: listCustomersApi })
  const linked = customers?.find((c) => c.demoWorkspaceId === ws && c.status !== "deleted")
  const [cycle, setCycle] = useState<BillingCycle | null>(null)
  const used = seatsUsed(accounts)
  const shownCycle = cycle ?? sub?.subscription.cycle ?? "monthly"

  const change = useMutation({
    mutationFn: ({ plan, c }: { plan: ErpPlan["id"]; c: BillingCycle }) => changeWorkspacePlanApi(ws, plan, c, used),
    onSuccess: () => {
      toast.success(t("subChanged"))
      qc.invalidateQueries({ queryKey: ["subscription", ws] })
      qc.invalidateQueries({ queryKey: ["subscription-invoices", ws] })
    },
    onError: (err) => toast.error(translateError(err, t)),
  })

  // Nexora bills every company in MAD (VAT 20%), whatever the workspace currency
  const usd = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: NEXORA_CURRENCY, maximumFractionDigits: 0 }).format(n)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const company = settings?.company.legalName || workspace.name

  const pdf = (inv: SubscriptionInvoice) => {
    const plan = t(`plan_${inv.planId}`)
    const doc: Invoice = {
      id: inv.id,
      invoiceNumber: inv.number,
      user: { id: ws, name: company, email: settings?.company.email ?? "" } as Invoice["user"],
      items: [{ id: "1", description: `Nexora ERP · ${plan} · ${t(inv.cycle === "yearly" ? "subYearly" : "subMonthly")}`, quantity: 1, unitPrice: inv.subtotal, total: inv.subtotal }],
      subtotal: inv.subtotal,
      tax: inv.tax,
      taxRate: inv.taxRate,
      total: inv.total,
      status: inv.status === "paid" ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
      method: InvoiceMethod.CARD,
      date: inv.date,
      paidAt: inv.status === "paid" ? inv.date : undefined,
      createdAt: inv.date,
    }
    return generateInvoicePdf(doc, locale)
  }

  if (linked) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader />
        <NexoraSubscriptionView customer={linked} used={used} />
      </div>
    )
  }
  if (isLoading || !sub || loadingCustomers) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader />
        <ListSkeleton rows={3} />
      </div>
    )
  }
  const { subscription, plan } = sub
  const currentIndex = ERP_PLANS.findIndex((p) => p.id === plan.id)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />

      {/* Current plan */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-panel lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subCurrentPlan")}</p>
              <p className="mt-1 text-2xl font-semibold">Nexora {t(`plan_${plan.id}`)}</p>
              <p className="text-sm text-muted-foreground">
                {usd(planPrice(plan, subscription.cycle))} / {t(subscription.cycle === "yearly" ? "subYear" : "subMonth")} · {t("subRenews", { date: date(subscription.renewsAt) })}
              </p>
            </div>
            <Badge variant="outline" className="bg-success-soft text-success-foreground border-transparent">{t(`subStatus_${subscription.status}`)}</Badge>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium"><KeyRound className="size-4" /> {t("subSeats")}</span>
              <span className="tabular-nums text-muted-foreground">{plan.seats < 0 ? t("subSeatsUnlimited", { used }) : t("subSeatsUsed", { used, total: plan.seats })}</span>
            </div>
            <Progress value={plan.seats < 0 ? 10 : Math.min(100, (used / plan.seats) * 100)} aria-label={t("subSeats")} className="h-2" />
            <Link href="/dashboard/access" className="mt-2 inline-block text-sm text-primary hover:underline">{t("subManageAccess")}</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subPayment")}</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium"><CreditCard className="size-4" /> {subscription.paymentMethod ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("subPaymentHint")}</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("subMemberSince")}</p>
          <p className="mt-1 text-sm">{date(subscription.startedAt)}</p>
        </div>
      </section>

      {/* Plans */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("subPlans")}</h2>
          <div className="flex rounded-full border border-border p-1 text-sm" role="tablist" aria-label={t("subBilling")}>
            {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
              <button key={c} type="button" role="tab" aria-selected={shownCycle === c} onClick={() => setCycle(c)} className={cn("rounded-full px-3 py-1", shownCycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {t(c === "yearly" ? "subYearlySave" : "subMonthly")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ERP_PLANS.map((p, i) => {
            const current = p.id === plan.id && shownCycle === subscription.cycle
            const tooSmall = p.seats >= 0 && used > p.seats
            return (
              <div key={p.id} className={cn("flex flex-col rounded-2xl border p-4", p.id === plan.id ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                <p className="font-semibold">{t(`plan_${p.id}`)}</p>
                <p className="mt-1 text-2xl font-semibold">{usd(planPrice(p, shownCycle))}<span className="text-sm font-normal text-muted-foreground"> / {t(shownCycle === "yearly" ? "subYear" : "subMonth")}</span></p>
                <p className="text-xs text-muted-foreground">{p.seats < 0 ? t("subUnlimitedUsers") : t("subUpToUsers", { count: p.seats })}</p>
                <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><CheckCircle className="mt-0.5 size-4 shrink-0 text-success-foreground" />{t(f)}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={current ? "outline" : i > currentIndex ? "primary" : "outline"}
                  disabled={current || tooSmall || change.isPending}
                  onClick={() => change.mutate({ plan: p.id, c: shownCycle })}
                >
                  {current ? t("subCurrent") : tooSmall ? t("subTooSmall") : i > currentIndex ? t("subUpgrade") : i < currentIndex ? t("subDowngrade") : t("subSwitchCycle")}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Invoices from Nexora */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("subInvoices")}</h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="w-40 font-mono text-xs">{inv.number}</span>
              <span className="flex-1 text-muted-foreground">{date(inv.date)} · {t(`plan_${inv.planId}`)}</span>
              <span className="font-medium tabular-nums">{usd(inv.total)}</span>
              <Badge variant="outline" className="bg-success-soft text-success-foreground border-transparent">{t("paid")}</Badge>
              <Button variant="ghost" size="sm" aria-label={t("downloadPdf")} onClick={() => pdf(inv)}><DownloadIcon className="size-4" /></Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
