"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { ArrowLeft, ArrowRight, Ban, CalendarDays, CheckCircle, FileText, LockKeyholeOpen, Pencil, Store, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link, useRouter } from "@/i18n/navigation"
import { useWorkspaceStore } from "@/store/workspace-store"
import { useConsoleActor, useConsoleAudit, useConsoleCustomers, useConsoleDirectory, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { useNxDocuments } from "@/hooks/platform/use-nx-documents"
import { useSupportRequests } from "@/hooks/platform/use-platform-support"
import { Badge } from "@/components/ui/badge"
import type { CustomerIdentityInput } from "@/lib/api/platform-customers-api"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { accountMrr, canTransition, customerHealth, seatLimit } from "@/lib/platform/customer-lifecycle"
import { NEXORA_PLANS, formatMad, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { useBillingMutations, useNxDunning, useNxInvoices, useNxPayments, useNxSubscriptions } from "@/hooks/platform/use-platform-billing"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InvoiceStatusBadge } from "./billing-shared"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import { ACTION_LABEL, StepUpDialog } from "./console-shared"
import { LifecycleBadge } from "./lifecycle-badge"

type Pending = "activate" | "cancel" | "undoCancel" | "lift" | "extend"

/**
 * One customer's account (CUS-04): identity, plan, seats, invoices, notes and
 * console history, with the lifecycle actions. Never the company's business data.
 */
export default function CustomerAccountPage({ customerId }: { customerId: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const setWorkspace = useWorkspaceStore((s) => s.setCurrent)
  const actor = useConsoleActor()
  const { data: customers = [], isLoading } = useConsoleCustomers()
  const { data: events = [] } = useConsoleAudit()
  const m = useConsoleMutations()
  const [pending, setPending] = useState<Pending | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspend, setSuspend] = useState({ reason: "", until: "" })
  const [stepUp, setStepUp] = useState(false)
  const [note, setNote] = useState("")
  const c = customers.find((x) => x.id === customerId)
  const { data: allInvoices = [] } = useNxInvoices()
  const invoices = allInvoices.filter((i) => i.customerId === customerId)
  const billing = useBillingMutations()
  const [startOpen, setStartOpen] = useState(false)
  const [start, setStart] = useState({ plan: "business" as NexoraPlanId, billing: "monthly" as "monthly" | "yearly", method: "card" as "card" | "transfer" })
  const docs = useNxDocuments()
  const { data: allPayments = [] } = useNxPayments()
  const { data: dunning = [] } = useNxDunning()
  const { data: subs = [] } = useNxSubscriptions()
  const { data: requests = [] } = useSupportRequests()
  const { data: directory = [] } = useConsoleDirectory()
  const [editing, setEditing] = useState<CustomerIdentityInput | null>(null)
  const [now] = useState(() => new Date())

  const money = (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA")
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))

  if (isLoading) return <div className="p-4 md:p-6"><ListSkeleton /></div>
  if (!c) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title={t("cuNotFound")} />
        <EmptyState icon={Store} title={t("cuNotFound")} action={<Button asChild variant="outline"><Link href="/dashboard/platform">{t("cuBackToList")}</Link></Button>} />
      </div>
    )
  }

  const role = actor?.role
  const canStatus = consoleCan(role, C.CHANGE_STATUS)
  const canSuspend = consoleCan(role, C.SUSPEND)
  const canTrial = consoleCan(role, C.CREATE_TRIAL)
  const limit = seatLimit(c)
  const history = events.filter((e) => e.customerId === c.id)
  const plan = planById(c.plan)

  const confirmText: Record<Pending, string> = {
    activate: c.status === "cancelled" ? t("cuConfirmReactivate", { name: c.name }) : t("cuConfirmActivate", { name: c.name, plan: plan.name }),
    cancel: c.status === "trial" || c.status === "suspended" ? t("cuConfirmCancelNow", { name: c.name }) : t("cuConfirmCancel", { name: c.name }),
    undoCancel: t("cuConfirmUndo", { name: c.name }),
    lift: t("cuConfirmLift", { name: c.name, status: c.suspension ? t(`lcStatus_${c.suspension.previous}`) : "" }),
    extend: t("cuConfirmExtend", { name: c.name }),
  }
  const run = (p: Pending) => {
    if (p === "activate") m.activate.mutate(c.id)
    if (p === "cancel") m.cancel.mutate(c.id)
    if (p === "undoCancel") m.undoCancel.mutate(c.id)
    if (p === "lift") m.liftCustomer.mutate(c.id)
    if (p === "extend") m.extendTrial.mutate(c.id)
  }
  const ask = (p: Pending) => {
    setPending(p)
    if (p === "lift" && needsStepUp(role, C.SUSPEND)) setStepUp(true)
  }

  const payments = allPayments.filter((p) => p.customerId === c.id)
  const reminders = dunning.filter((d) => invoices.some((i) => i.id === d.invoiceId)).sort((a, b) => b.date.localeCompare(a.date))
  const sub = subs.find((s) => s.customerId === c.id)
  const theirRequests = requests.filter((r) => r.customerId === c.id)
  const people = directory.filter((u) => u.customerId === c.id)
  const lastSignInAt = people.map((u) => u.lastSignInAt).filter(Boolean).sort().pop()
  const openRequests = theirRequests.filter((r) => r.status === "open" || r.status === "waiting_customer")
  const health = customerHealth(c, { lastSignInAt, openRequests: openRequests.length, urgentRequests: openRequests.filter((r) => r.priority === "urgent").length }, now)
  const canEdit = consoleCan(role, C.CHANGE_SUBSCRIPTION)
  const openEdit = () =>
    setEditing({ name: c.name, city: c.city, country: c.country, ice: c.ice ?? "", taxId: c.taxId ?? "", rc: c.rc ?? "", address: c.address ?? "", phone: c.phone ?? "", adminName: c.admin.name, adminEmail: c.admin.email, adminPhone: c.admin.phone ?? "" })

  const facts: [string, React.ReactNode][] = [
    [t("cuLegalName"), c.name],
    ["ICE", c.ice ?? "—"],
    [t("cuTaxIds"), [c.taxId && `IF ${c.taxId}`, c.rc && `RC ${c.rc}`].filter(Boolean).join(" · ") || "—"],
    [t("cuAddress"), <span key="ad">{c.address ? `${c.address}, ` : ""}{c.city}, {c.country}{c.phone && <span className="block text-xs text-muted-foreground">{c.phone}</span>}</span>],
    [t("pfAdmin"), <span key="a">{c.admin.name}<span className="block text-xs text-muted-foreground">{c.admin.email}{c.admin.phone ? ` · ${c.admin.phone}` : ""}</span></span>],
    [t("pfPlan"), `${plan.name} · ${t(c.billing === "yearly" ? "pfYearly" : "pfMonthly")}`],
    [t("pfMrrCol"), accountMrr(c) ? money(accountMrr(c)) : "—"],
    [t("pfSince"), date(c.since)],
    ...(sub ? ([[t("cuSubscription"), <span key="s">{date(sub.periodStart)} → {date(sub.periodEnd)}<span className="block text-xs text-muted-foreground">{t(sub.method === "card" ? "subCard" : "subTransfer")}{sub.scheduledPlan ? ` · ${t("subWillBecome", { plan: planById(sub.scheduledPlan).name, date: date(sub.periodEnd) })}` : ""}</span></span>]] as [string, React.ReactNode][]) : []),
    ...(c.status === "trial" && c.trialEndsOn ? [[t("pfTrialEndsLabel"), `${date(c.trialEndsOn)}${c.trialExtended ? ` · ${t("cuExtendedOnce")}` : ""}`] as [string, string]] : []),
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={c.name}
        badge={<LifecycleBadge status={c.status} />}
        description={t("cuAccountDesc")}
        actions={
          <>
            <Button variant="outline" asChild><Link href="/dashboard/platform"><ArrowLeft className="size-4 rtl:rotate-180" />{t("cuBackToList")}</Link></Button>
            {canEdit && <Button variant="outline" onClick={openEdit}><Pencil className="size-4" />{t("cuEdit")}</Button>}
            {c.demoWorkspaceId && (
              <Button variant="outline" onClick={() => { setWorkspace(c.demoWorkspaceId!); router.push("/dashboard/my-work") }}>
                {t("pfOpenWorkspace")} <ArrowRight className="size-4 rtl:rotate-180" />
              </Button>
            )}
          </>
        }
      />

      {/* state banners: read-only, suspension, planned cancellation */}
      {c.status === "suspended" && c.suspension && (
        <p role="status" className="rounded-2xl bg-danger-soft p-3 text-sm text-destructive">
          {t("cuSuspendedBanner", { reason: c.suspension.reason, by: c.suspension.by, date: date(c.suspension.at) })}
          {c.suspension.until && ` ${t("cuSuspendedUntil", { date: date(c.suspension.until) })}`}
        </p>
      )}
      {c.cancelsOn && <p role="status" className="rounded-2xl bg-warning-soft p-3 text-sm text-warning-foreground">{t("cuCancelBanner", { date: date(c.cancelsOn) })}</p>}
      {c.readOnly && c.status !== "suspended" && <p role="status" className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{t("cuReadOnlyBanner")}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="flex-1 text-base font-semibold">{t("cuAccount")}</h2>
              <Badge variant="outline" className={cn("border-transparent", health.level === "good" ? "bg-success-soft text-success-foreground" : health.level === "watch" ? "bg-warning-soft text-warning-foreground" : "bg-danger-soft text-destructive")}>{t(`cuHealth_${health.level}`)}</Badge>
            </div>
            {health.reasons.length > 0 && <p className="mb-3 text-xs text-muted-foreground">{t("cuHealthWhy", { reasons: health.reasons.map((r) => t(`cuHealthR_${r}`)).join(" · ") })}</p>}
            <dl className="grid gap-3 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm"><span>{t("pfSeatsCol")}</span><span className="tabular-nums">{limit ? `${c.seatsUsed} / ${limit}` : t("pfUnlimited", { count: c.seatsUsed })}</span></div>
              {limit && <Progress value={Math.min(100, (c.seatsUsed / limit) * 100)} aria-label={t("pfSeatsCol")} className={cn("h-2", c.seatsUsed >= limit && "[&>div]:bg-warning")} />}
              {/* SUB-09: the notice sent to the company's administrator this period */}
              {limit && c.seatsUsed >= limit && c.seatsFullNotice && <p className="mt-1 text-xs text-warning-foreground">{t("cuSeatsNoticeSent", { date: date(c.seatsFullNotice.at) })}</p>}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("cuNoBusinessData")}</p>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 className="mb-3 text-base font-semibold">{t("pfInvoices")}</h2>
            {invoices.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("pfNoInvoices")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {invoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{i.number}</span>
                    <span className="text-xs text-muted-foreground">{date(i.date)}</span>
                    <span className="ms-auto tabular-nums">{money(i.total)}</span>
                    <InvoiceStatusBadge status={i.status} />
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => void docs.invoicePdf(i)} aria-label={t("biDownloadPdfOf", { number: i.number })}><FileText className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 className="mb-3 text-base font-semibold">{t("cuPayments")}</h2>
            {payments.length === 0 ? <p className="text-sm text-muted-foreground">{t("biNoPayment")}</p> : (
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{date(p.date)}</span>
                    <span>{t(p.method === "card" ? "subCard" : "subTransfer")}{p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.reference}</span>
                    <span className="ms-auto tabular-nums">{money(p.amount)}</span>
                    <Badge variant="outline" className={cn("border-transparent", p.status === "succeeded" ? "bg-success-soft text-success-foreground" : p.status === "failed" ? "bg-danger-soft text-destructive" : "bg-muted text-muted-foreground")}>{t(`biPay_${p.status}`)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {reminders.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold">{t("cuReminders")}</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {reminders.map((r) => (
                    <li key={r.id} className="flex flex-wrap gap-2 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{date(r.date)}</span>
                      <span>{t("trDay", { day: r.day })} · {t(`trKind_${r.kind}`)}</span>
                      <span className="ms-auto text-xs text-muted-foreground">{t(r.kind === "retry" ? "cuChannelCard" : "cuChannelEmail")} · {r.result}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="flex-1 text-base font-semibold">{t("cuSupport")}</h2>
              <Link href="/dashboard/support-desk" className="text-sm text-primary hover:underline">{t("supportDesk")}</Link>
            </div>
            {theirRequests.length === 0 ? <p className="text-sm text-muted-foreground">{t("cuNoSupport")}</p> : (
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {theirRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{r.number}</span>
                    <span className="min-w-0 flex-1">{r.subject}</span>
                    <span className="text-xs text-muted-foreground">{t(`supPr_${r.priority}`)}</span>
                    <span className="text-xs">{t(`supSt_${r.status}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 className="mb-3 text-base font-semibold">{t("cuHistory")}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("cuNoHistory")}</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {history.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    <div>
                      <p><span className="font-medium">{e.actorName}</span> · {t(ACTION_LABEL[e.action])}{e.after ? ` · ${e.after}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{when(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 className="mb-1 text-base font-semibold">{t("cuActions")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t("cuActionsHint")}</p>
            <div className="flex flex-col gap-2">
              {canTrial && c.status === "trial" && !c.trialExtended && (
                <Button variant="outline" className="justify-start" onClick={() => ask("extend")}><CalendarDays className="size-4" />{t("cuExtendTrial")}</Button>
              )}
              {consoleCan(role, C.CHANGE_SUBSCRIPTION) && c.status === "trial" && (
                <Button variant="outline" className="justify-start" onClick={() => { setStart({ plan: c.plan, billing: "monthly", method: "card" }); setStartOpen(true) }}><CheckCircle className="size-4" />{t("cuConvert")}</Button>
              )}
              {canStatus && canTransition(c.status, "active") && c.status !== "suspended" && c.status !== "trial" && (
                <Button variant="outline" className="justify-start" onClick={() => ask("activate")}><CheckCircle className="size-4" />{c.status === "cancelled" ? t("cuReactivate") : t("cuMarkPaid")}</Button>
              )}
              {canSuspend && c.status === "suspended" && (
                <Button variant="outline" className="justify-start" onClick={() => ask("lift")}><LockKeyholeOpen className="size-4" />{t("cuLift")}</Button>
              )}
              {canSuspend && canTransition(c.status, "suspended") && (
                <Button variant="outline" className="justify-start text-destructive" onClick={() => setSuspendOpen(true)}><Ban className="size-4" />{t("cuSuspend")}</Button>
              )}
              {canStatus && c.cancelsOn && (
                <Button variant="outline" className="justify-start" onClick={() => ask("undoCancel")}><CheckCircle className="size-4" />{t("cuUndoCancel")}</Button>
              )}
              {canStatus && canTransition(c.status, "cancelled") && !c.cancelsOn && (
                <Button variant="outline" className="justify-start text-destructive" onClick={() => ask("cancel")}><XCircle className="size-4" />{t("cuCancel")}</Button>
              )}
              {!canStatus && !canSuspend && !canTrial && <p className="text-sm text-muted-foreground">{t("cuNoActions")}</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 className="mb-1 text-base font-semibold">{t("cuNotes")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t("cuNotesHint")}</p>
            {role !== ConsoleRole.READ_ONLY && (
              <form
                className="mb-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  m.addNote.mutate({ id: c.id, text: note }, { onSuccess: () => setNote("") })
                }}
              >
                <Label htmlFor="cu-note" className="sr-only">{t("cuNotes")}</Label>
                <Textarea id="cu-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("cuNotePlaceholder")} />
                <Button type="submit" size="sm" disabled={!note.trim()}>{t("cuAddNote")}</Button>
              </form>
            )}
            {c.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("cuNoNotes")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {c.notes.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-muted/50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.author} · {when(n.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="edit"
        createTitle=""
        editTitle={t("cuEditTitle", { name: c.name })}
        description={t("cuEditDesc")}
        isSubmitting={m.updateCustomer.isPending}
        submitLabel={{ edit: t("save") }}
        onSubmit={() => editing && m.updateCustomer.mutate({ id: c.id, input: editing }, { onSuccess: () => setEditing(null) })}
      >
        {editing && (
          <div className="space-y-4">
            {([["name", "cuLegalName"], ["address", "cuAddress"], ["city", "cuCity"]] as const).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`ed-${k}`}>{t(label)}</Label>
                <Input id={`ed-${k}`} value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="ed-country">{t("cuCountry")}</Label>
              <Select value={editing.country} onValueChange={(v) => setEditing({ ...editing, country: v })}>
                <SelectTrigger id="ed-country"><SelectValue>{editing.country}</SelectValue></SelectTrigger>
                <SelectContent>{["MA", "FR", "ES", "BE", "US", "GB", "DE", "SN", "CI", "TN", "DZ", "AE"].map((cc) => <SelectItem key={cc} value={cc}>{cc}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([["ice", "ICE"], ["taxId", "IF"], ["rc", "RC"]] as const).map(([k, label]) => (
                <div key={k} className={cn("space-y-1.5", k === "ice" && "col-span-2")}>
                  <Label htmlFor={`ed-${k}`}>{label}</Label>
                  <Input id={`ed-${k}`} value={editing[k] ?? ""} inputMode={k === "ice" ? "numeric" : undefined} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-phone">{t("cuPhone")}</Label>
              <Input id="ed-phone" type="tel" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </div>
            <fieldset className="space-y-3 rounded-2xl border border-border p-3">
              <legend className="px-1 text-sm font-medium">{t("pfAdmin")}</legend>
              <div className="space-y-1.5"><Label htmlFor="ed-an">{t("cuAdminName")}</Label><Input id="ed-an" value={editing.adminName} onChange={(e) => setEditing({ ...editing, adminName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ed-ae">{t("cuAdminEmail")}</Label><Input id="ed-ae" type="email" value={editing.adminEmail} onChange={(e) => setEditing({ ...editing, adminEmail: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ed-ap">{t("cuPhone")}</Label><Input id="ed-ap" type="tel" value={editing.adminPhone ?? ""} onChange={(e) => setEditing({ ...editing, adminPhone: e.target.value })} /></div>
            </fieldset>
            <p className="text-xs text-muted-foreground">{t("cuEditNote")}</p>
          </div>
        )}
      </DataTableEntityFormSheet>

      <DataTableEntityFormSheet
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        mode="create"
        createTitle={t("cuSuspendTitle", { name: c.name })}
        editTitle={t("cuSuspendTitle", { name: c.name })}
        description={t("cuSuspendDesc")}
        isSubmitting={m.suspendCustomer.isPending}
        submitLabel={{ create: t("cuSuspend") }}
        onSubmit={() => setStepUp(true)}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="su-reason">{t("cuReason")}</Label>
            <Textarea id="su-reason" rows={3} value={suspend.reason} onChange={(e) => setSuspend({ ...suspend, reason: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-until">{t("cuUntilOptional")}</Label>
            <Input id="su-until" type="date" value={suspend.until} onChange={(e) => setSuspend({ ...suspend, until: e.target.value })} />
          </div>
        </div>
      </DataTableEntityFormSheet>

      <DataTableEntityFormSheet
        open={startOpen}
        onOpenChange={setStartOpen}
        mode="create"
        createTitle={t("biStartTitle", { name: c.name })}
        editTitle=""
        description={t("biStartDesc")}
        isSubmitting={billing.start.isPending}
        submitLabel={{ create: t("biStart") }}
        onSubmit={() => billing.start.mutate({ customerId: c.id, ...start }, { onSuccess: () => setStartOpen(false) })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-plan">{t("pfPlan")}</Label>
            <Select value={start.plan} onValueChange={(v) => setStart({ ...start, plan: v as NexoraPlanId })}>
              <SelectTrigger id="st-plan"><SelectValue>{planById(start.plan).name}</SelectValue></SelectTrigger>
              <SelectContent>{NEXORA_PLANS.filter((p) => !p.retired).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {money(p.monthly)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-billing">{t("cuBilling")}</Label>
            <Select value={start.billing} onValueChange={(v) => setStart({ ...start, billing: v as "monthly" | "yearly" })}>
              <SelectTrigger id="st-billing"><SelectValue>{t(start.billing === "yearly" ? "pfYearly" : "pfMonthly")}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="monthly">{t("pfMonthly")}</SelectItem><SelectItem value="yearly">{t("pfYearly")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-method">{t("subMethod")}</Label>
            <Select value={start.method} onValueChange={(v) => setStart({ ...start, method: v as "card" | "transfer" })}>
              <SelectTrigger id="st-method"><SelectValue>{t(start.method === "card" ? "subCard" : "subTransfer")}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="card">{t("subCard")}</SelectItem><SelectItem value="transfer">{t("subTransfer")}</SelectItem></SelectContent>
            </Select>
          </div>
          <p className="rounded-2xl bg-info-soft p-3 text-sm text-info-foreground">{t("biStartPreview", { amount: money((start.billing === "yearly" ? 10 : 1) * planById(start.plan).monthly * (c.country === "MA" ? 1.2 : 1)) })}</p>
        </div>
      </DataTableEntityFormSheet>

      <StepUpDialog
        open={stepUp}
        onOpenChange={(v) => {
          setStepUp(v)
          if (!v) setPending(null)
        }}
        action={pending === "lift" ? confirmText.lift : t("cuStepUpSuspend", { name: c.name })}
        onConfirmed={() => {
          if (pending === "lift") run("lift")
          else m.suspendCustomer.mutate({ id: c.id, reason: suspend.reason, until: suspend.until || undefined }, { onSuccess: () => { setSuspendOpen(false); setSuspend({ reason: "", until: "" }) } })
        }}
      />
      <ConfirmAlertDialog
        open={!!pending && !(pending === "lift" && needsStepUp(role, C.SUSPEND))}
        onOpenChange={(v) => !v && setPending(null)}
        title={t("stfConfirmTitle")}
        description={pending ? confirmText[pending] : ""}
        destructive={pending === "cancel"}
        onConfirm={() => {
          if (pending) run(pending)
          setPending(null)
        }}
      />
    </div>
  )
}
