"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Store, TrendingUp, Users, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link, useRouter } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { consoleCan } from "@/lib/platform/console-roles"
import { accountMrr, accountsSummary, seatLimit } from "@/lib/platform/customer-lifecycle"
import { NEXORA_PLANS, formatMad, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { cn } from "@/lib/utils"
import { ConsoleCapability } from "@/types/platform-console"
import { LIFECYCLE, LifecycleBadge } from "./lifecycle-badge"

const ALL = "all"
const EMPTY_TRIAL = { name: "", city: "", country: "MA", ice: "", plan: "business" as NexoraPlanId, adminName: "", adminEmail: "" }

/** The companies using Nexora (CUS-01 to CUS-03, CUS-05). Opening one shows its account page. */
export default function PlatformCustomersPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const actor = useConsoleActor()
  const { data: customers = [], isLoading } = useConsoleCustomers()
  const m = useConsoleMutations()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [plan, setPlan] = useState<string>(ALL)
  const [billing, setBilling] = useState<string>(ALL)
  const [country, setCountry] = useState<string>(ALL)
  const [trialOpen, setTrialOpen] = useState(false)
  const [trial, setTrial] = useState(EMPTY_TRIAL)

  const sum = accountsSummary(customers)
  const money = (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA")
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const q = query.trim().toLowerCase()
  const rows = customers
    .filter(
      (c) =>
        (status === ALL || c.status === status) &&
        (plan === ALL || c.plan === plan) &&
        (billing === ALL || c.billing === billing) &&
        (country === ALL || c.country === country) &&
        (!q || `${c.name} ${c.city} ${c.ice ?? ""} ${c.admin.name} ${c.admin.email}`.toLowerCase().includes(q))
    )
    .sort((a, b) => accountMrr(b) - accountMrr(a) || a.name.localeCompare(b.name))

  const cards: MetricCardItem[] = [
    { key: "mrr", title: t("pfMrr"), value: money(sum.mrr), valueClassName: "text-primary", footer: { icon: TrendingUp, text: t("pfArr", { arr: money(sum.arr) }) } },
    { key: "customers", title: t("pfCustomers"), value: sum.customers, footer: { icon: Store, text: t("pfCustomersHint", { paying: sum.paying, trials: sum.trials }) } },
    { key: "seats", title: t("pfSeats"), value: sum.seats, footer: { icon: Users, text: t("pfSeatsHint") } },
    { key: "risk", title: t("cuAtRisk"), value: money(sum.atRisk), valueClassName: sum.atRisk ? "text-warning-foreground" : undefined, footer: { icon: Warning, text: t("cuAtRiskHint", { overdue: sum.overdue, suspended: sum.suspended }) } },
  ]

  const mix = NEXORA_PLANS.map((p) => {
    const list = customers.filter((c) => c.plan === p.id && c.status !== "cancelled")
    return { plan: p, count: list.length, mrr: list.reduce((s, c) => s + accountMrr(c), 0) }
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={consoleCan(actor?.role, ConsoleCapability.CREATE_TRIAL) ? <Button onClick={() => setTrialOpen(true)}><Plus className="size-4" />{t("cuNewTrial")}</Button> : undefined} />
      <MetricCardGrid cards={cards} />

      <section className="grid gap-3 md:grid-cols-3">
        {mix.map(({ plan: p, count, mrr }) => (
          <div key={p.id} className="rounded-3xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{p.name}</p>
              <span className="text-xs text-muted-foreground">{t("pfPlanPrice", { price: money(p.monthly) })}</span>
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
            <p className="text-sm text-muted-foreground">{t("cuListHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input className="w-56" placeholder={t("cuSearch")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("cuSearch")} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44 bg-card" aria-label={t("status")}><SelectValue>{status === ALL ? t("pfAllStatuses") : t(`lcStatus_${status}`)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("pfAllStatuses")}</SelectItem>
                {LIFECYCLE.map((s) => <SelectItem key={s} value={s}>{t(`lcStatus_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-36 bg-card" aria-label={t("pfPlan")}><SelectValue>{plan === ALL ? t("cuAllPlans") : planById(plan as NexoraPlanId).name}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("cuAllPlans")}</SelectItem>
                {NEXORA_PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={billing} onValueChange={setBilling}>
              <SelectTrigger className="w-36 bg-card" aria-label={t("cuBilling")}><SelectValue>{billing === ALL ? t("cuAllBilling") : t(billing === "yearly" ? "pfYearly" : "pfMonthly")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("cuAllBilling")}</SelectItem>
                <SelectItem value="monthly">{t("pfMonthly")}</SelectItem>
                <SelectItem value="yearly">{t("pfYearly")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-32 bg-card" aria-label={t("cuCountry")}><SelectValue>{country === ALL ? t("cuAllCountries") : country}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("cuAllCountries")}</SelectItem>
                {[...new Set(customers.map((c) => c.country))].sort().map((cc) => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Store} title={t("cuEmpty")} hint={t("audEmptyHint")} />
        ) : (
          <TableContainer>
            <Table className="min-w-[52rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("pfPlan")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="w-44">{t("pfSeatsCol")}</TableHead>
                  <TableHead className="text-end">{t("pfMrrCol")}</TableHead>
                  <TableHead>{t("pfSince")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const limit = seatLimit(c)
                  const mrr = accountMrr(c)
                  const open = () => router.push(`/dashboard/platform/${c.id}`)
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={open}>
                      <TableCell>
                        {/* a real link keeps keyboard and screen-reader access */}
                        <Link href={`/dashboard/platform/${c.id}`} onClick={(e) => e.stopPropagation()} className="rounded font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{c.name}</Link>
                        <p className="text-xs text-muted-foreground">{c.city}, {c.country} · {c.admin.name}</p>
                      </TableCell>
                      <TableCell>{planById(c.plan).name}<span className="block text-xs text-muted-foreground">{t(c.billing === "yearly" ? "pfYearly" : "pfMonthly")}</span></TableCell>
                      <TableCell>
                        <LifecycleBadge status={c.status} />
                        {c.status === "trial" && c.trialEndsOn && <span className="block text-xs text-muted-foreground">{t("pfTrialEnds", { date: date(c.trialEndsOn) })}</span>}
                        {c.cancelsOn && <span className="block text-xs text-muted-foreground">{t("cuCancelsOn", { date: date(c.cancelsOn) })}</span>}
                      </TableCell>
                      <TableCell>
                        {limit ? (
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, (c.seatsUsed / limit) * 100)} aria-label={t("pfSeatsCol")} className={cn("h-2 flex-1", c.seatsUsed >= limit && "[&>div]:bg-warning")} />
                            <span className="text-xs tabular-nums">{c.seatsUsed}/{limit}</span>
                          </div>
                        ) : (
                          <span className="text-xs tabular-nums">{t("pfUnlimited", { count: c.seatsUsed })}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium tabular-nums">{mrr ? money(mrr) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{date(c.since)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>

      <DataTableEntityFormSheet
        open={trialOpen}
        onOpenChange={setTrialOpen}
        mode="create"
        createTitle={t("cuNewTrial")}
        editTitle={t("cuNewTrial")}
        description={t("cuTrialDesc")}
        isSubmitting={m.createTrial.isPending}
        submitLabel={{ create: t("cuCreateTrial") }}
        onSubmit={() =>
          m.createTrial.mutate({ ...trial, ice: trial.ice || undefined }, {
            onSuccess: (c) => {
              setTrialOpen(false)
              setTrial(EMPTY_TRIAL)
              router.push(`/dashboard/platform/${c.id}`)
            },
          })
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tr-name">{t("cuLegalName")}</Label>
            <Input id="tr-name" value={trial.name} onChange={(e) => setTrial({ ...trial, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tr-city">{t("cuCity")}</Label>
              <Input id="tr-city" value={trial.city} onChange={(e) => setTrial({ ...trial, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-country">{t("cuCountry")}</Label>
              <Select value={trial.country} onValueChange={(v) => setTrial({ ...trial, country: v })}>
                <SelectTrigger id="tr-country"><SelectValue>{trial.country}</SelectValue></SelectTrigger>
                <SelectContent>{["MA", "FR", "BE", "ES", "SN", "TN", "US"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-ice">{t("cuIceOptional")}</Label>
            <Input id="tr-ice" inputMode="numeric" maxLength={15} value={trial.ice} onChange={(e) => setTrial({ ...trial, ice: e.target.value.replace(/\D/g, "") })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-plan">{t("cuPlanToTry")}</Label>
            <Select value={trial.plan} onValueChange={(v) => setTrial({ ...trial, plan: v as NexoraPlanId })}>
              <SelectTrigger id="tr-plan"><SelectValue>{planById(trial.plan).name}</SelectValue></SelectTrigger>
              <SelectContent>{NEXORA_PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-admin">{t("cuAdminName")}</Label>
            <Input id="tr-admin" value={trial.adminName} onChange={(e) => setTrial({ ...trial, adminName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-email">{t("cuAdminEmail")}</Label>
            <Input id="tr-email" type="email" value={trial.adminEmail} onChange={(e) => setTrial({ ...trial, adminEmail: e.target.value })} />
          </div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("cuTrialNote")}</p>
        </div>
      </DataTableEntityFormSheet>
    </div>
  )
}
