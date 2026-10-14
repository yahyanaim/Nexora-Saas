"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Plus } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { KpiTile } from "@/components/shared/kpi-tile"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { DataTableRowActions } from "@/components/shared/data-table-chunks/data-table-row-actions"
import type { CustomerAccount } from "@/types/platform-customers"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useRouter } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { consoleCan } from "@/lib/platform/console-roles"
import { accountMrr, accountsSummary, seatLimit } from "@/lib/platform/customer-lifecycle"
import { NEXORA_PLANS, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { cn } from "@/lib/utils"
import { ConsoleCapability } from "@/types/platform-console"
import { LIFECYCLE, LifecycleBadge } from "./lifecycle-badge"
import { NameCell, inSelection, searchIn, sortHeader } from "./console-table"
import { formatConsoleMoney } from "./billing-shared"

const EMPTY_TRIAL = { name: "", city: "", country: "MA", ice: "", plan: "business" as NexoraPlanId, adminName: "", adminEmail: "" }

/** The companies using Nexora (CUS-01 to CUS-03, CUS-05). Opening one shows its account page. */
export default function PlatformCustomersPage() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const actor = useConsoleActor()
  const { data: customers = [], isLoading } = useConsoleCustomers()
  const m = useConsoleMutations()
  const [trialOpen, setTrialOpen] = useState(false)
  const [trial, setTrial] = useState(EMPTY_TRIAL)

  const sum = accountsSummary(customers)
  const money = (n: number) => formatConsoleMoney(n, locale)
  // tiles without cents, as on the companies' Analytics
  const tileMoney = (n: number) => formatConsoleMoney(n, locale, { whole: true })
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const canTrial = consoleCan(actor?.role, ConsoleCapability.CREATE_TRIAL)

  const columns = useMemo<ColumnDef<CustomerAccount>[]>(() => [
    {
      id: "name",
      accessorFn: (c) => c.name,
      header: sortHeader(t("pfCompany")),
      filterFn: searchIn<CustomerAccount>((c) => [c.name, c.city, c.ice, c.admin.name, c.admin.email]),
      cell: ({ row: { original: c } }) => <NameCell name={c.name} sub={`${c.city}, ${c.country} · ${c.admin.name}`} href={`/dashboard/platform/${c.id}`} />,
    },
    {
      id: "plan",
      accessorFn: (c) => c.plan,
      sortingFn: (a, b) => planById(a.original.plan).monthly - planById(b.original.plan).monthly,
      header: sortHeader(t("pfPlan")),
      filterFn: inSelection,
      cell: ({ row: { original: c } }) => <span>{planById(c.plan).name}<span className="block text-xs text-muted-foreground">{t(c.billing === "yearly" ? "pfYearly" : "pfMonthly")}</span></span>,
    },
    { id: "billing", accessorFn: (c) => c.billing, filterFn: inSelection, enableSorting: false, header: t("cuBilling") },
    { id: "country", accessorFn: (c) => c.country, filterFn: inSelection, enableSorting: false, header: t("cuCountry") },
    {
      id: "status",
      accessorFn: (c) => c.status,
      header: sortHeader(t("status")),
      filterFn: inSelection,
      cell: ({ row: { original: c } }) => (
        <span>
          <LifecycleBadge status={c.status} />
          {c.status === "trial" && c.trialEndsOn && <span className="block text-xs text-muted-foreground">{t("pfTrialEnds", { date: date(c.trialEndsOn) })}</span>}
          {c.cancelsOn && <span className="block text-xs text-muted-foreground">{t("cuCancelsOn", { date: date(c.cancelsOn) })}</span>}
        </span>
      ),
    },
    {
      id: "seats",
      accessorFn: (c) => c.seatsUsed,
      header: sortHeader(t("pfSeatsCol")),
      meta: { className: "w-44" },
      cell: ({ row: { original: c } }) => {
        const limit = seatLimit(c)
        return limit ? (
          <div className="flex items-center gap-2">
            <Progress value={Math.min(100, (c.seatsUsed / limit) * 100)} aria-label={t("pfSeatsCol")} className={cn("h-2 flex-1", c.seatsUsed >= limit && "[&>div]:bg-warning")} />
            <span className="text-xs tabular-nums">{c.seatsUsed}/{limit}</span>
          </div>
        ) : <span className="text-xs tabular-nums">{t("pfUnlimited", { count: c.seatsUsed })}</span>
      },
    },
    {
      id: "mrr",
      accessorFn: (c) => accountMrr(c),
      header: sortHeader(t("pfMrrCol")),
      cell: ({ row: { original: c } }) => <span className="font-medium tabular-nums">{accountMrr(c) ? money(accountMrr(c)) : "—"}</span>,
    },
    { id: "since", accessorFn: (c) => c.since, header: sortHeader(t("pfSince")), cell: ({ row: { original: c } }) => <span className="text-xs text-muted-foreground">{date(c.since)}</span> },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row: { original: c } }) => <DataTableRowActions row={c} actions={[{ label: t("cuOpenAccount"), icon: Eye, onClick: () => router.push(`/dashboard/platform/${c.id}`) }]} />,
    },
  // the formatters only change with the language
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, locale])

  const mix = NEXORA_PLANS.map((p) => {
    const list = customers.filter((c) => c.plan === p.id && c.status !== "cancelled")
    return { plan: p, count: list.length, mrr: list.reduce((s, c) => s + accountMrr(c), 0) }
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile title={t("pfMrr")} value={tileMoney(sum.mrr)} period={t("chToday")} description={t("cuTileMrr")} noteLabel={t("anOperationalNote")} note={t("pfArr", { arr: money(sum.arr) })} isLoading={isLoading} />
        <KpiTile title={t("pfCustomers")} value={String(sum.customers)} period={t("chToday")} description={t("cuTileCustomers")} noteLabel={t("anOperationalNote")} note={t("pfCustomersHint", { paying: sum.paying, trials: sum.trials })} isLoading={isLoading} />
        <KpiTile title={t("pfSeats")} value={String(sum.seats)} period={t("chToday")} description={t("pfSeatsHint")} isLoading={isLoading} />
        <KpiTile title={t("cuAtRisk")} value={tileMoney(sum.atRisk)} period={t("chToday")} description={t("cuTileAtRisk")} noteLabel={t("anOperationalNote")} note={t("cuAtRiskHint", { overdue: sum.overdue, suspended: sum.suspended })} isLoading={isLoading} />
      </div>

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

      {/* UX-05: biggest revenue first, any column sorts, 10 per page */}
      <DataTable
        title={t("pfList")}
        isLoading={isLoading}
        columns={columns}
        data={customers}
        searchColumnId="name"
        searchPlaceholder={t("cuSearch")}
        emptyMessage={t("cuEmpty")}
        defaultSorting={[{ id: "mrr", desc: true }]}
        defaultColumnVisibility={{ billing: false, country: false }}
        showRange
        exportFilename="nexora-customers"
        getExportData={() => customers.map((c) => ({ company: c.name, city: c.city, country: c.country, ice: c.ice ?? "", plan: planById(c.plan).name, billing: c.billing, status: c.status, people: c.seatsUsed, mrr: accountMrr(c), since: c.since }))}
        actions={canTrial ? [{ label: t("cuNewTrial"), icon: Plus, onClick: () => setTrialOpen(true), variant: "primary", iconOnly: true }] : []}
        filters={[
          { columnId: "status", title: t("status"), options: LIFECYCLE.map((s) => ({ value: s, label: t(`lcStatus_${s}`) })) },
          { columnId: "plan", title: t("pfPlan"), options: NEXORA_PLANS.map((p) => ({ value: p.id, label: p.name })) },
          { columnId: "billing", title: t("cuBilling"), options: [{ value: "monthly", label: t("pfMonthly") }, { value: "yearly", label: t("pfYearly") }] },
          { columnId: "country", title: t("cuCountry"), options: [...new Set(customers.map((c) => c.country))].sort().map((cc) => ({ value: cc, label: cc })) },
        ]}
      />

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
