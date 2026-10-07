"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpRight, CalendarDays, Play, RefreshCw, Wallet } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, useNxSubscriptions, usePlanVersions } from "@/hooks/platform/use-platform-billing"
import { consoleCan } from "@/lib/platform/console-roles"
import { addDays, isoOf, periodPrice, proration, versionOn } from "@/lib/platform/billing"
import { NEXORA_PLANS, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { NxSubscription } from "@/types/platform-billing"
import { LifecycleBadge } from "./lifecycle-badge"
import { Panel, useBillingFormat } from "./billing-shared"

/** Each customer's subscription: plan, period, seats, payment method and changes (SUB-01 to SUB-08). */
export default function ConsoleSubscriptionsPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: subs = [], isLoading } = useNxSubscriptions()
  const { data: customers = [] } = useConsoleCustomers()
  const { data: versions = [] } = usePlanVersions()
  const m = useBillingMutations()
  const [editing, setEditing] = useState<NxSubscription | null>(null)
  const [plan, setPlan] = useState<NexoraPlanId>("business")
  const today = isoOf(new Date())
  const canChange = consoleCan(actor?.role, C.CHANGE_SUBSCRIPTION)
  const canRun = !!actor && [ConsoleRole.OWNER, ConsoleRole.ADMIN, ConsoleRole.FINANCE, ConsoleRole.ENGINEERING].includes(actor.role)
  const price = (s: NxSubscription) => versions.find((v) => v.id === s.versionId)?.monthly ?? 0
  const rows = subs.map((s) => ({ s, c: customers.find((c) => c.id === s.customerId) })).filter((r) => r.c).sort((a, b) => a.s.periodEnd.localeCompare(b.s.periodEnd))

  const renewSoon = rows.filter((r) => r.s.periodEnd <= addDays(today, 7))
  const cards: MetricCardItem[] = [
    { key: "subs", title: t("subActive"), value: rows.filter((r) => r.c!.status !== "cancelled").length, footer: { icon: Wallet, text: t("subActiveHint", { card: rows.filter((r) => r.s.method === "card").length, transfer: rows.filter((r) => r.s.method === "transfer").length }) } },
    { key: "renew", title: t("subRenewSoon"), value: renewSoon.length, footer: { icon: CalendarDays, text: t("subRenewSoonHint") } },
    { key: "scheduled", title: t("subScheduled"), value: rows.filter((r) => r.s.scheduledPlan).length, footer: { icon: RefreshCw, text: t("subScheduledHint") } },
  ]

  // preview of what the change costs today (UX-02)
  const preview = (() => {
    if (!editing) return null
    const v = versionOn(versions, plan, today)
    if (!v || plan === editing.plan) return null
    const pr = proration(periodPrice(price(editing), editing.billing), periodPrice(v.monthly, editing.billing), editing.periodStart, editing.periodEnd, today)
    return v.monthly > price(editing) ? t("subPreviewUp", { amount: money(pr.amount), vat: money(pr.amount * 1.2), days: pr.remaining, total: pr.days }) : t("subPreviewDown", { date: date(editing.periodEnd) })
  })()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canRun ? <Button variant="outline" onClick={() => m.runJobs.mutate({ cardOutcome: "ok" })} disabled={m.runJobs.isPending}><Play className="size-4" />{t("subRunJobs")}</Button> : undefined}
      />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-3" />
      <Panel title={t("subList")} hint={t("subListHint")}>
        {isLoading ? <ListSkeleton /> : (
          <TableContainer>
            <Table className="min-w-[58rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("pfPlan")}</TableHead>
                  <TableHead className="text-end">{t("subPrice")}</TableHead>
                  <TableHead>{t("subPeriod")}</TableHead>
                  <TableHead>{t("subMethod")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ s, c }) => (
                  <TableRow key={s.id}>
                    <TableCell><Link href={`/dashboard/platform/${c!.id}`} className="font-medium hover:underline">{c!.name}</Link><span className="block text-xs text-muted-foreground">{t("subSeats", { used: c!.seatsUsed, limit: planById(s.plan).seats > 0 ? planById(s.plan).seats : "∞" })}</span></TableCell>
                    <TableCell>
                      {planById(s.plan).name} · {t(s.billing === "yearly" ? "pfYearly" : "pfMonthly")}
                      {s.scheduledPlan && <span className="block text-xs text-warning-foreground">{t("subWillBecome", { plan: planById(s.scheduledPlan).name, date: date(s.periodEnd) })}</span>}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{money(periodPrice(price(s), s.billing))}<span className="block text-xs text-muted-foreground">{t("subExclVat")}</span></TableCell>
                    <TableCell className="text-sm">{date(s.periodStart)} → {date(s.periodEnd)}<span className="block text-xs text-muted-foreground">{t("subRenews", { date: date(s.periodEnd) })}</span></TableCell>
                    <TableCell><Badge variant="outline">{t(s.method === "card" ? "subCard" : "subTransfer")}</Badge></TableCell>
                    <TableCell><LifecycleBadge status={c!.status} /></TableCell>
                    <TableCell>{canChange && c!.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => { setEditing(s); setPlan(s.plan) }}><ArrowUpRight className="size-4" />{t("subChangePlan")}</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("subJobsNote")}</p>
      </Panel>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="create"
        createTitle={editing ? t("subChangeTitle", { name: customers.find((c) => c.id === editing.customerId)?.name ?? "" }) : ""}
        editTitle=""
        description={t("subChangeDesc")}
        isSubmitting={m.changePlan.isPending}
        submitLabel={{ create: t("subApply") }}
        onSubmit={() => editing && m.changePlan.mutate({ customerId: editing.customerId, plan }, { onSuccess: () => setEditing(null) })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sub-plan">{t("pfPlan")}</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as NexoraPlanId)}>
              <SelectTrigger id="sub-plan"><SelectValue>{planById(plan).name}</SelectValue></SelectTrigger>
              <SelectContent>{NEXORA_PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {preview && <p role="status" className="rounded-2xl bg-info-soft p-3 text-sm text-info-foreground">{preview}</p>}
        </div>
      </DataTableEntityFormSheet>
    </div>
  )
}
