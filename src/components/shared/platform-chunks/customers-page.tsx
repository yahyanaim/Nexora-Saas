"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, Store, TrendingUp, Users, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useRouter } from "@/i18n/navigation"
import { useWorkspaceStore } from "@/store/workspace-store"
import { cn } from "@/lib/utils"
import { consoleInvoices } from "@/lib/platform/console-data"
import { NEXORA_CUSTOMERS, NEXORA_PLANS, customerMrr, formatMad, planById, platformSummary, type CustomerStatus, type NexoraCustomer } from "@/lib/platform/nexora-catalog"

const STATUS_CLASS: Record<CustomerStatus, string> = {
  active: "bg-success-soft text-success-foreground border-transparent",
  trial: "bg-info-soft text-info-foreground border-transparent",
  past_due: "bg-danger-soft text-destructive border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
}
const ALL = "all"

/** The companies using Nexora, their plan and what they bring in (Phase 6h.4). */
export default function PlatformCustomersPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const setWorkspace = useWorkspaceStore((s) => s.setCurrent)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [open, setOpen] = useState<NexoraCustomer | null>(null)

  const sum = platformSummary()
  const invoices = useMemo(() => consoleInvoices(), [])
  const money = (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA")
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const rows = NEXORA_CUSTOMERS.filter(
    (c) => (status === ALL || c.status === status) && (!query || `${c.name} ${c.city} ${c.admin.name} ${c.admin.email}`.toLowerCase().includes(query.toLowerCase()))
  ).sort((a, b) => customerMrr(b) - customerMrr(a))

  const cards: MetricCardItem[] = [
    { key: "mrr", title: t("pfMrr"), value: money(sum.mrr), valueClassName: "text-primary", footer: { icon: TrendingUp, text: t("pfArr", { arr: money(sum.arr) }) } },
    { key: "customers", title: t("pfCustomers"), value: sum.customers, footer: { icon: Store, text: t("pfCustomersHint", { paying: sum.paying, trials: sum.trials }) } },
    { key: "seats", title: t("pfSeats"), value: sum.seats, footer: { icon: Users, text: t("pfSeatsHint") } },
    { key: "pastdue", title: t("pfPastDue"), value: sum.pastDue, valueClassName: sum.pastDue ? "text-destructive" : undefined, footer: { icon: Warning, text: t("pfPastDueHint", { cancelled: sum.cancelled }) } },
  ]

  const mix = NEXORA_PLANS.map((p) => {
    const list = NEXORA_CUSTOMERS.filter((c) => c.plan === p.id && c.status !== "cancelled")
    return { plan: p, count: list.length, mrr: list.reduce((s, c) => s + customerMrr(c), 0) }
  })

  const openWorkspace = (c: NexoraCustomer) => {
    if (!c.workspaceId) return
    setWorkspace(c.workspaceId)
    router.push("/dashboard/my-work")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} />

      <section className="grid gap-3 md:grid-cols-3">
        {mix.map(({ plan, count, mrr }) => (
          <div key={plan.id} className="rounded-3xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{plan.name}</p>
              <span className="text-xs text-muted-foreground">{t("pfPlanPrice", { price: money(plan.monthly) })}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p>
            <p className="text-xs text-muted-foreground">{t("pfPlanMix", { mrr: money(mrr) })}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("pfList")}</h2>
            <p className="text-sm text-muted-foreground">{t("pfListHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input className="w-56" placeholder={t("pfSearch")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("pfSearch")} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 bg-card" aria-label={t("status")}><SelectValue>{status === ALL ? t("pfAllStatuses") : t(`pfStatus_${status}`)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("pfAllStatuses")}</SelectItem>
                {(["active", "trial", "past_due", "cancelled"] as CustomerStatus[]).map((s) => <SelectItem key={s} value={s}>{t(`pfStatus_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("pfCompany")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("pfPlan")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("status")}</th>
                <th className="w-44 px-3 py-2 text-start font-medium">{t("pfSeatsCol")}</th>
                <th className="px-3 py-2 text-end font-medium">{t("pfMrrCol")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("pfSince")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const plan = planById(c.plan)
                const limit = plan.seats
                return (
                  <tr key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(c)}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.city}, {c.country} · {c.admin.name}</p>
                    </td>
                    <td className="px-3 py-2.5">{plan.name}<span className="block text-xs text-muted-foreground">{t(c.billing === "yearly" ? "pfYearly" : "pfMonthly")}</span></td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={STATUS_CLASS[c.status]}>{t(`pfStatus_${c.status}`)}</Badge>
                      {c.trialEndsOn && <span className="block text-xs text-muted-foreground">{t("pfTrialEnds", { date: date(c.trialEndsOn) })}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {limit > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(100, (c.seatsUsed / limit) * 100)} aria-label={t("pfSeatsCol")} className={cn("h-2 flex-1", c.seatsUsed >= limit && "[&>div]:bg-warning")} />
                          <span className="text-xs tabular-nums">{c.seatsUsed}/{limit}</span>
                        </div>
                      ) : (
                        <span className="text-xs tabular-nums">{t("pfUnlimited", { count: c.seatsUsed })}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end font-medium tabular-nums">{customerMrr(c) ? money(customerMrr(c)) : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{date(c.since)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>{open.city}, {open.country}{open.ice ? ` · ICE ${open.ice}` : ""}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-5 px-4 pb-6">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    [t("pfPlan"), `${planById(open.plan).name} · ${t(open.billing === "yearly" ? "pfYearly" : "pfMonthly")}`],
                    [t("status"), t(`pfStatus_${open.status}`)],
                    [t("pfMrrCol"), customerMrr(open) ? money(customerMrr(open)) : "—"],
                    [t("pfSeatsCol"), planById(open.plan).seats > 0 ? `${open.seatsUsed}/${planById(open.plan).seats}` : String(open.seatsUsed)],
                    [t("pfAdmin"), `${open.admin.name}`],
                    [t("email"), open.admin.email],
                    [t("pfSince"), date(open.since)],
                    ...(open.trialEndsOn ? [[t("pfTrialEndsLabel"), date(open.trialEndsOn)]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 truncate font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{t("pfInvoices")}</h3>
                  <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                    {invoices.filter((i) => i.user.orgId === open.id).map((i) => (
                      <li key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="font-mono text-xs">{i.invoiceNumber}</span>
                        <span className="text-xs text-muted-foreground">{date(i.date)}</span>
                        <span className="ms-auto tabular-nums">{money(i.total)}</span>
                        <Badge variant="outline" className={i.status === "paid" ? STATUS_CLASS.active : STATUS_CLASS.past_due}>{t(i.status === "paid" ? "pfPaid" : "pfOverdue")}</Badge>
                      </li>
                    ))}
                    {invoices.every((i) => i.user.orgId !== open.id) && <li className="px-3 py-3 text-center text-xs text-muted-foreground">{t("pfNoInvoices")}</li>}
                  </ul>
                </div>
                {open.workspaceId && (
                  <Button onClick={() => openWorkspace(open)}>{t("pfOpenWorkspace")} <ArrowRight className="size-4" /></Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
