"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LockKeyholeOpen } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers, useConsoleMutations, useUserSuspensions } from "@/hooks/platform/use-platform-console"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { ConsoleCapability as C } from "@/types/platform-console"
import { StepUpDialog } from "./console-shared"

type Lift = { kind: "user" | "customer"; id: string; label: string }

/** Every suspended person and company, with its reason, author and end date (USR-04, USR-06, CUS-08). */
export default function ConsoleSuspensionsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const actor = useConsoleActor()
  const { data: users = [], isLoading } = useUserSuspensions()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useConsoleMutations()
  const [lift, setLift] = useState<Lift | null>(null)
  const canLift = consoleCan(actor?.role, C.SUSPEND)
  const stepUp = needsStepUp(actor?.role, C.SUSPEND)
  const date = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)) : "—")
  const companies = customers.filter((c) => c.status === "suspended" && c.suspension)

  const doLift = (l: Lift) => (l.kind === "user" ? m.liftUser.mutate(l.id) : m.liftCustomer.mutate(l.id))
  const section = (title: string, rows: { key: string; who: React.ReactNode; reason: string; by: string; at: string; until?: string; lift: Lift }[], empty: string) => (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("spWho")}</TableHead>
                <TableHead>{t("cuReason")}</TableHead>
                <TableHead>{t("spBy")}</TableHead>
                <TableHead>{t("spUntil")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.who}</TableCell>
                  <TableCell className="max-w-72 text-sm">{r.reason}</TableCell>
                  <TableCell className="text-sm">{r.by}<span className="block text-xs text-muted-foreground">{date(r.at)}</span></TableCell>
                  <TableCell className="text-sm">{r.until ? date(r.until) : t("spNoEnd")}</TableCell>
                  <TableCell>{canLift && <Button size="sm" variant="outline" onClick={() => setLift(r.lift)}><LockKeyholeOpen className="size-4" />{t("cuLift")}</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <>
          {section(
            t("spCompanies"),
            companies.map((c) => ({
              key: c.id,
              who: <Link href={`/dashboard/platform/${c.id}`} className="font-medium hover:underline">{c.name}</Link>,
              reason: c.suspension!.reason, by: c.suspension!.by, at: c.suspension!.at, until: c.suspension!.until,
              lift: { kind: "customer" as const, id: c.id, label: c.name },
            })),
            t("spNoCompanies")
          )}
          {section(
            t("spPeople"),
            users.map((s) => ({
              key: s.id,
              who: <span><span className="font-medium">{s.name}</span><span className="block text-xs text-muted-foreground">{s.email} · {s.company}</span></span>,
              reason: s.reason, by: s.by, at: s.at, until: s.until,
              lift: { kind: "user" as const, id: s.id, label: s.name },
            })),
            t("spNoPeople")
          )}
        </>
      )}
      <StepUpDialog
        open={!!lift && stepUp}
        onOpenChange={(v) => !v && setLift(null)}
        action={lift ? t("spLiftConfirm", { name: lift.label }) : ""}
        onConfirmed={() => lift && doLift(lift)}
      />
      <ConfirmAlertDialog
        open={!!lift && !stepUp}
        onOpenChange={(v) => !v && setLift(null)}
        title={t("cuLift")}
        description={lift ? t("spLiftConfirm", { name: lift.label }) : ""}
        onConfirm={() => {
          if (lift) doLift(lift)
          setLift(null)
        }}
      />
    </div>
  )
}
