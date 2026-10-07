"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { consolePlans } from "@/lib/platform/console-data"
import { NEXORA_CUSTOMERS, NEXORA_PLANS, NEXORA_VAT_RATE, customerMrr, formatMad } from "@/lib/platform/nexora-catalog"

/**
 * The plans Nexora sells, seen from the platform console (Phase 6h.4): price,
 * what each includes and how many companies are on it. Companies choose and
 * change their plan in their own workspace (System → My subscription).
 */
export default function PlansPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [yearly, setYearly] = useState(false)
  const money = (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA")
  const limits = Object.fromEntries(consolePlans().map((p) => [p.id, p]))

  const rows: { label: string; value: (id: string) => React.ReactNode }[] = [
    { label: t("plnPeople"), value: (id) => (limits[id]?.limits?.teamMembers === -1 ? t("plnUnlimited") : String(limits[id]?.limits?.teamMembers)) },
    { label: t("plnWorkspaces"), value: (id) => (limits[id]?.limits?.workspaces === -1 ? t("plnSeveral") : "1") },
    { label: t("plnStorage"), value: (id) => `${limits[id]?.limits?.storageGb} GB` },
    { label: t("plnApi"), value: (id) => (limits[id]?.limits?.apiCallsMonthly === -1 ? t("plnUnlimited") : (limits[id]?.limits?.apiCallsMonthly ?? 0).toLocaleString(locale)) },
    { label: t("plnMorocco"), value: (id) => (id === "starter" ? false : true) },
    { label: t("plnSso"), value: (id) => !!limits[id]?.ssoEnabled },
    { label: t("plnAudit"), value: (id) => !!limits[id]?.auditLogsEnabled },
    { label: t("plnSupport"), value: (id) => t(`plnSupport_${id}`) },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("plnVatNote", { vat: NEXORA_VAT_RATE })}</p>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          <Button size="sm" variant={yearly ? "ghost" : "default"} className="rounded-full" onClick={() => setYearly(false)}>{t("pfMonthly")}</Button>
          <Button size="sm" variant={yearly ? "default" : "ghost"} className="rounded-full" onClick={() => setYearly(true)}>{t("pfYearly")} · {t("plnTwoFree")}</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {NEXORA_PLANS.map((p) => {
          const customers = NEXORA_CUSTOMERS.filter((c) => c.plan === p.id && c.status !== "cancelled")
          const mrr = customers.reduce((s, c) => s + customerMrr(c), 0)
          return (
            <section key={p.id} className={cn("relative flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-panel", p.featured ? "border-primary" : "border-border")}>
              {p.featured && <Badge className="absolute -top-3 start-5">{t("plnMostChosen")}</Badge>}
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
              </div>
              <p className="text-3xl font-semibold tabular-nums">
                {money(yearly ? p.monthly * 10 : p.monthly)}
                <span className="ms-1 text-sm font-normal text-muted-foreground">{t(yearly ? "plnPerYear" : "plnPerMonth")}</span>
              </p>
              <div className="rounded-2xl bg-muted/50 px-3 py-2 text-sm">
                <span className="font-semibold tabular-nums">{customers.length}</span> {t("plnCompanies")} · {t("plnBrings", { mrr: money(mrr) })}
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("plnCompare")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("plnCompareHint")}</p>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("plnFeature")}</th>
                {NEXORA_PLANS.map((p) => <th key={p.id} className="px-3 py-2 text-start font-medium">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-3 py-2">{r.label}</td>
                  {NEXORA_PLANS.map((p) => {
                    const v = r.value(p.id)
                    return (
                      <td key={p.id} className="px-3 py-2">
                        {v === true ? <Check className="size-4 text-success" aria-label={t("plnIncluded")} /> : v === false ? <X className="size-4 text-muted-foreground" aria-label={t("plnNotIncluded")} /> : v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
