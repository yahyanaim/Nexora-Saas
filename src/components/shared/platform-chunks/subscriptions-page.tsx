"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Play, RefreshCw, Settings, Wallet } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, useNxSubscriptions, usePlanVersions } from "@/hooks/platform/use-platform-billing"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { addDays, isoOf, periodPrice, proration, versionOn } from "@/lib/platform/billing"
import { seatLimit } from "@/lib/platform/customer-lifecycle"
import { NEXORA_PLANS, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { NxSubscription } from "@/types/platform-billing"
import { LifecycleBadge } from "./lifecycle-badge"
import { StepUpDialog } from "./console-shared"
import { Panel, useBillingFormat } from "./billing-shared"

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Each customer's subscription and everything that can change in it (SUB-01 to SUB-10, PLA-08). */
export default function ConsoleSubscriptionsPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: subs = [], isLoading } = useNxSubscriptions()
  const { data: customers = [] } = useConsoleCustomers()
  const { data: versions = [] } = usePlanVersions()
  const m = useBillingMutations()
  const [openId, setOpenId] = useState<string | null>(null)
  const [plan, setPlan] = useState<NexoraPlanId>("business")
  const [discount, setDiscount] = useState({ kind: "percent" as "percent" | "amount", value: "", invoices: "", reason: "" })
  const [extension, setExtension] = useState({ seats: "", until: "", reason: "" })
  const [cancel, setCancel] = useState({ reason: "", refund: true })
  const [stepUp, setStepUp] = useState(false)
  const [today] = useState(() => isoOf(new Date()))
  const canChange = consoleCan(actor?.role, C.CHANGE_SUBSCRIPTION)
  const canCancelNow = consoleCan(actor?.role, C.CREDIT_NOTES)
  const canRun = !!actor && [ConsoleRole.OWNER, ConsoleRole.ADMIN, ConsoleRole.FINANCE, ConsoleRole.ENGINEERING].includes(actor.role)
  const price = (s: NxSubscription) => versions.find((v) => v.id === s.versionId)?.monthly ?? 0
  const rows = subs.map((s) => ({ s, c: customers.find((c) => c.id === s.customerId) })).filter((r) => r.c).sort((a, b) => a.s.periodEnd.localeCompare(b.s.periodEnd))
  const open = rows.find((r) => r.s.id === openId) ?? null

  const renewSoon = rows.filter((r) => r.s.periodEnd <= addDays(today, 7))
  const cards: MetricCardItem[] = [
    { key: "subs", title: t("subActive"), value: rows.filter((r) => r.c!.status !== "cancelled").length, footer: { icon: Wallet, text: t("subActiveHint", { card: rows.filter((r) => r.s.method === "card").length, transfer: rows.filter((r) => r.s.method === "transfer").length }) } },
    { key: "renew", title: t("subRenewSoon"), value: renewSoon.length, footer: { icon: CalendarDays, text: t("subRenewSoonHint") } },
    { key: "scheduled", title: t("subScheduled"), value: rows.filter((r) => r.s.scheduledPlan || r.s.scheduledBilling).length, footer: { icon: RefreshCw, text: t("subScheduledHint") } },
    { key: "discounts", title: t("subDiscounts"), value: rows.filter((r) => r.s.discount).length, footer: { icon: Settings, text: t("subDiscountsHint") } },
  ]

  const openManage = (s: NxSubscription) => {
    setOpenId(s.id)
    setPlan(s.plan)
    setDiscount({ kind: "percent", value: "", invoices: "", reason: "" })
    setExtension({ seats: "", until: addDays(today, 30), reason: "" })
    setCancel({ reason: "", refund: true })
  }

  // preview of what a plan change costs today (UX-02)
  const preview = (() => {
    if (!open) return null
    const s = open.s
    const v = versionOn(versions, plan, today)
    if (!v || plan === s.plan) return null
    const pr = proration(periodPrice(price(s), s.billing), periodPrice(v.monthly, s.billing), s.periodStart, s.periodEnd, today)
    return v.monthly > price(s) ? t("subPreviewUp", { amount: money(pr.amount), vat: money(pr.amount * 1.2), days: pr.remaining, total: pr.days }) : t("subPreviewDown", { date: date(s.periodEnd) })
  })()
  // SUB-05: credit for the unused monthly days
  const billingPreview = (() => {
    if (!open || open.s.billing !== "monthly") return null
    const s = open.s
    const total = Math.round((new Date(s.periodEnd).getTime() - new Date(s.periodStart).getTime()) / 86_400_000) + 1
    const left = Math.max(0, Math.round((new Date(s.periodEnd).getTime() - new Date(today).getTime()) / 86_400_000) + 1)
    const credit = Math.round(((price(s) * left) / total) * 100) / 100
    return t("subToYearlyPreview", { amount: money(price(s) * 10), credit: money(credit), net: money(price(s) * 10 - credit) })
  })()
  const doCancel = () => open && m.cancelNow.mutate({ customerId: open.s.customerId, ...cancel }, { onSuccess: () => setOpenId(null) })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canRun ? <Button variant="outline" onClick={() => m.runJobs.mutate({ cardOutcome: "ok" })} disabled={m.runJobs.isPending}><Play className="size-4" />{t("subRunJobs")}</Button> : undefined}
      />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      <Panel title={t("subList")} hint={t("subListHint")}>
        {isLoading ? <ListSkeleton /> : (
          <TableContainer>
            <Table className="min-w-[62rem]">
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
                {rows.map(({ s, c }) => {
                  const limit = seatLimit(c!, today)
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Link href={`/dashboard/platform/${c!.id}`} className="font-medium hover:underline">{c!.name}</Link><span className="block text-xs text-muted-foreground">{t("subSeats", { used: c!.seatsUsed, limit: limit ?? "∞" })}{s.extension ? ` · ${t("subExtra", { n: s.extension.seats })}` : ""}</span></TableCell>
                      <TableCell>
                        {planById(s.plan).name} · {t(s.billing === "yearly" ? "pfYearly" : "pfMonthly")}
                        {s.scheduledPlan && <span className="block text-xs text-warning-foreground">{t("subWillBecome", { plan: planById(s.scheduledPlan).name, date: date(s.periodEnd) })}</span>}
                        {s.scheduledBilling && <span className="block text-xs text-warning-foreground">{t("subWillBillMonthly", { date: date(addDays(s.periodEnd, 1)) })}</span>}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{money(periodPrice(price(s), s.billing))}<span className="block text-xs text-muted-foreground">{s.discount ? t("subWithDiscount", { value: s.discount.kind === "percent" ? `${s.discount.value}%` : money(s.discount.value) }) : t("subExclVat")}</span></TableCell>
                      <TableCell className="text-sm">{date(s.periodStart)} → {date(s.periodEnd)}<span className="block text-xs text-muted-foreground">{t("subRenews", { date: date(s.periodEnd) })}</span></TableCell>
                      <TableCell><Badge variant="outline">{t(s.method === "card" ? "subCard" : "subTransfer")}</Badge></TableCell>
                      <TableCell><LifecycleBadge status={c!.status} /></TableCell>
                      <TableCell>{c!.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => openManage(s)}><Settings className="size-4" />{t("subManage")}</Button>}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("subJobsNote")}</p>
      </Panel>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-xl">{t("subManageTitle", { name: open.c!.name })}</SheetTitle>
                <SheetDescription>{planById(open.s.plan).name} · {t(open.s.billing === "yearly" ? "pfYearly" : "pfMonthly")} · {money(periodPrice(price(open.s), open.s.billing))} · {date(open.s.periodStart)} → {date(open.s.periodEnd)}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {!canChange && <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{t("subReadOnlyRole")}</p>}

                <Section title={t("subChangePlan")} hint={t("subChangeDesc")}>
                  <Label htmlFor="sub-plan" className="sr-only">{t("pfPlan")}</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as NexoraPlanId)}>
                    <SelectTrigger id="sub-plan" disabled={!canChange}><SelectValue>{planById(plan).name}</SelectValue></SelectTrigger>
                    <SelectContent>{NEXORA_PLANS.filter((p) => !p.retired || p.id === open.s.plan).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {preview && <p role="status" className="rounded-xl bg-info-soft p-3 text-sm text-info-foreground">{preview}</p>}
                  {canChange && <Button size="sm" disabled={plan === open.s.plan || m.changePlan.isPending} onClick={() => m.changePlan.mutate({ customerId: open.s.customerId, plan })}>{t("subApply")}</Button>}
                </Section>

                <Section title={t("subBillingTitle")} hint={t("subBillingHint")}>
                  <p className="text-sm">{t("subBillingNowIs", { billing: t(open.s.billing === "yearly" ? "pfYearly" : "pfMonthly") })}{open.s.scheduledBilling ? ` · ${t("subWillBillMonthly", { date: date(addDays(open.s.periodEnd, 1)) })}` : ""}</p>
                  {billingPreview && <p className="rounded-xl bg-info-soft p-3 text-sm text-info-foreground">{billingPreview}</p>}
                  {canChange && (open.s.billing === "monthly"
                    ? <Button size="sm" variant="outline" onClick={() => m.changeBilling.mutate({ customerId: open.s.customerId, billing: "yearly" })} disabled={m.changeBilling.isPending}>{t("subToYearly")}</Button>
                    : !open.s.scheduledBilling && <Button size="sm" variant="outline" onClick={() => m.changeBilling.mutate({ customerId: open.s.customerId, billing: "monthly" })} disabled={m.changeBilling.isPending}>{t("subToMonthly")}</Button>)}
                </Section>

                <Section title={t("subMethod")} hint={t("subMethodHint")}>
                  <div className="flex flex-wrap gap-2">
                    {(["card", "transfer"] as const).map((meth) => (
                      <Button key={meth} size="sm" variant={open.s.method === meth ? "primary" : "outline"} disabled={!canChange || open.s.method === meth || m.changeMethod.isPending} onClick={() => m.changeMethod.mutate({ customerId: open.s.customerId, method: meth })}>
                        {t(meth === "card" ? "subCard" : "subTransfer")}
                      </Button>
                    ))}
                  </div>
                </Section>

                <Section title={t("subDiscount")} hint={t("subDiscountHint")}>
                  {open.s.discount ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                      <span className="flex-1">{open.s.discount.kind === "percent" ? `${open.s.discount.value}%` : money(open.s.discount.value)} · {open.s.discount.reason} · {open.s.discount.invoicesLeft === null ? t("subUntilRemoved") : t("subInvoicesLeft", { n: open.s.discount.invoicesLeft })}<span className="block text-xs text-muted-foreground">{open.s.discount.by} · {date(open.s.discount.since)}</span></span>
                      {canChange && <Button size="sm" variant="outline" onClick={() => m.removeDiscount.mutate(open.s.customerId)}>{t("subRemove")}</Button>}
                    </div>
                  ) : canChange && (
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.setDiscount.mutate({ customerId: open.s.customerId, kind: discount.kind, value: Number(discount.value), invoices: discount.invoices ? Number(discount.invoices) : null, reason: discount.reason }) }}>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="dc-kind">{t("subDiscountKind")}</Label>
                          <Select value={discount.kind} onValueChange={(v) => setDiscount({ ...discount, kind: v as "percent" | "amount" })}>
                            <SelectTrigger id="dc-kind"><SelectValue>{discount.kind === "percent" ? "%" : "MAD"}</SelectValue></SelectTrigger>
                            <SelectContent><SelectItem value="percent">%</SelectItem><SelectItem value="amount">MAD</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label htmlFor="dc-value">{t("subDiscountValue")}</Label><Input id="dc-value" inputMode="decimal" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="dc-inv">{t("subDiscountInvoices")}</Label><Input id="dc-inv" inputMode="numeric" placeholder="∞" value={discount.invoices} onChange={(e) => setDiscount({ ...discount, invoices: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label htmlFor="dc-reason">{t("cuReason")}</Label><Input id="dc-reason" value={discount.reason} onChange={(e) => setDiscount({ ...discount, reason: e.target.value })} /></div>
                      <Button type="submit" size="sm" disabled={m.setDiscount.isPending}>{t("subSaveDiscount")}</Button>
                    </form>
                  )}
                  {!open.s.discount && !canChange && <p className="text-sm text-muted-foreground">{t("subNoDiscount")}</p>}
                </Section>

                {planById(open.s.plan).seats > 0 && (
                  <Section title={t("subExtension")} hint={t("subExtensionHint")}>
                    {open.s.extension ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                        <span className="flex-1">{t("subExtra", { n: open.s.extension.seats })} · {t("subUntil", { date: date(open.s.extension.until) })} · {open.s.extension.reason}<span className="block text-xs text-muted-foreground">{open.s.extension.by}</span></span>
                        {canChange && <Button size="sm" variant="outline" onClick={() => m.removeExtension.mutate(open.s.customerId)}>{t("subRemove")}</Button>}
                      </div>
                    ) : canChange && (
                      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.setExtension.mutate({ customerId: open.s.customerId, seats: Number(extension.seats), until: extension.until, reason: extension.reason }) }}>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5"><Label htmlFor="ex-seats">{t("subExtraPeople")}</Label><Input id="ex-seats" inputMode="numeric" value={extension.seats} onChange={(e) => setExtension({ ...extension, seats: e.target.value })} /></div>
                          <div className="space-y-1.5"><Label htmlFor="ex-until">{t("subUntilLabel")}</Label><Input id="ex-until" type="date" value={extension.until} onChange={(e) => setExtension({ ...extension, until: e.target.value })} /></div>
                        </div>
                        <div className="space-y-1.5"><Label htmlFor="ex-reason">{t("cuReason")}</Label><Input id="ex-reason" value={extension.reason} onChange={(e) => setExtension({ ...extension, reason: e.target.value })} /></div>
                        <Button type="submit" size="sm" disabled={m.setExtension.isPending}>{t("subSaveExtension")}</Button>
                      </form>
                    )}
                  </Section>
                )}

                <Section title={t("subHistory")}>
                  <ol className="space-y-2 text-sm">
                    {[...open.s.history].reverse().map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        <span>{t(`subH_${h.kind}`)}{h.from || h.to ? ` · ${[h.from, h.to].filter(Boolean).join(" → ")}` : ""}<span className="block text-xs text-muted-foreground">{h.by} · {date(h.at)}</span></span>
                      </li>
                    ))}
                  </ol>
                </Section>

                {canCancelNow && (
                  <Section title={t("subCancelNow")} hint={t("subCancelNowHint")}>
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (cancel.refund && needsStepUp(actor?.role, C.REFUND_SMALL)) setStepUp(true); else doCancel() }}>
                      <div className="space-y-1.5"><Label htmlFor="cn-reason">{t("cuReason")}</Label><Textarea id="cn-reason" rows={2} value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} /></div>
                      <Switch checked={cancel.refund} onCheckedChange={(refund) => setCancel({ ...cancel, refund })} labelText={t("subRefundUnused")} />
                      <Button type="submit" size="sm" variant="outline" className="text-destructive" disabled={m.cancelNow.isPending}>{t("subCancelNowButton")}</Button>
                    </form>
                  </Section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <StepUpDialog open={stepUp} onOpenChange={setStepUp} action={open ? t("subCancelStepUp", { name: open.c!.name }) : ""} onConfirmed={doCancel} />
    </div>
  )
}
