"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { ArrowLeft, ArrowRight, Ban, CalendarDays, CheckCircle, LockKeyholeOpen, Store, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link, useRouter } from "@/i18n/navigation"
import { useWorkspaceStore } from "@/store/workspace-store"
import { useConsoleActor, useConsoleAudit, useConsoleCustomers, useConsoleMutations } from "@/hooks/platform/use-platform-console"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { accountMrr, canTransition, seatLimit } from "@/lib/platform/customer-lifecycle"
import { consoleInvoices } from "@/lib/platform/console-data"
import { formatMad, planById } from "@/lib/platform/nexora-catalog"
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
  const invoices = useMemo(() => consoleInvoices().filter((i) => i.user.orgId === customerId), [customerId])

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

  const facts: [string, React.ReactNode][] = [
    [t("cuLegalName"), c.name],
    ["ICE", c.ice ?? "—"],
    [t("cuCity"), `${c.city}, ${c.country}`],
    [t("pfAdmin"), <span key="a">{c.admin.name}<span className="block text-xs text-muted-foreground">{c.admin.email}</span></span>],
    [t("pfPlan"), `${plan.name} · ${t(c.billing === "yearly" ? "pfYearly" : "pfMonthly")}`],
    [t("pfMrrCol"), accountMrr(c) ? money(accountMrr(c)) : "—"],
    [t("pfSince"), date(c.since)],
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
            <h2 className="mb-3 text-base font-semibold">{t("cuAccount")}</h2>
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
                    <span className="font-mono text-xs">{i.invoiceNumber}</span>
                    <span className="text-xs text-muted-foreground">{date(i.date)}</span>
                    <span className="ms-auto tabular-nums">{money(i.total)}</span>
                    <Badge variant="outline" className={cn("border-transparent", i.status === "paid" ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground")}>{t(i.status === "paid" ? "pfPaid" : "pfOverdue")}</Badge>
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
              {canStatus && canTransition(c.status, "active") && c.status !== "suspended" && (
                <Button variant="outline" className="justify-start" onClick={() => ask("activate")}><CheckCircle className="size-4" />{c.status === "cancelled" ? t("cuReactivate") : c.status === "trial" ? t("cuConvert") : t("cuMarkPaid")}</Button>
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
