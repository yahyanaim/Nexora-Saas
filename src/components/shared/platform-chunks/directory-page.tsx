"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Ban, DownloadIcon, Mail, ShieldCheck, UserX, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link } from "@/i18n/navigation"
import { useConsoleActor, useConsoleDirectory, useConsoleMutations, useRecordDirectoryExport } from "@/hooks/platform/use-platform-console"
import { exportToCsv } from "@/lib/utils/export-data"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import type { DirectoryUser } from "@/lib/api/platform-customers-api"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import { StepUpDialog } from "./console-shared"

const ALL = "all"
const STATUS_CLASS: Record<DirectoryUser["status"], string> = {
  active: "bg-success-soft text-success-foreground",
  suspended: "bg-danger-soft text-destructive",
  inactive: "bg-muted text-muted-foreground",
}

/** People of the customer companies, account fields only (USR-01 to USR-06). */
export default function ConsoleDirectoryPage() {
  const t = useTranslations()
  const locale = useLocale()
  const actor = useConsoleActor()
  const { data: people = [], isLoading } = useConsoleDirectory()
  const m = useConsoleMutations()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(ALL)
  const [reset, setReset] = useState<DirectoryUser | null>(null)
  const [target, setTarget] = useState<DirectoryUser | null>(null)
  const [form, setForm] = useState({ reason: "", until: "" })
  const [stepUp, setStepUp] = useState(false)
  const [exporting, setExporting] = useState(false)
  const recordExport = useRecordDirectoryExport()

  const canSuspend = consoleCan(actor?.role, C.SUSPEND)
  // USR-08: platform owners only, with the authenticator code; the export is in the audit trail (AUD-07)
  const canExport = consoleCan(actor?.role, C.EXPORT_AUDIT)
  const canReset = !!actor && [ConsoleRole.OWNER, ConsoleRole.ADMIN, ConsoleRole.SUPPORT].includes(actor.role)
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)) : "—")
  const q = query.trim().toLowerCase()
  const rows = people.filter((u) => (status === ALL || u.status === status) && (!q || `${u.name} ${u.email} ${u.company}`.toLowerCase().includes(q)))

  const doExport = () => {
    // SEC-14: every row carries who exported it and when
    const stamp = new Date().toISOString()
    const ok = exportToCsv(
      rows.map((u) => ({ name: u.name, email: u.email, company: u.company, role: t(u.companyRole === "owner" ? "usrRoleAdmin" : "usrRoleMember"), twoFactor: u.twoFactor ? "yes" : "no", status: t(`usrStatus_${u.status}`), lastSignIn: u.lastSignInAt ?? "", exportedBy: actor?.name ?? "", exportedAt: stamp })),
      `nexora-directory-${stamp.slice(0, 10)}`,
      [
        { key: "name", label: t("usrPerson") }, { key: "email", label: t("email") }, { key: "company", label: t("pfCompany") }, { key: "role", label: t("usrCompanyRole") },
        { key: "twoFactor", label: t("stf2faCol") }, { key: "status", label: t("status") }, { key: "lastSignIn", label: t("stfLastSignIn") },
        { key: "exportedBy", label: t("usrExportedBy") }, { key: "exportedAt", label: t("usrExportedAt") },
      ],
    )
    if (ok) recordExport.mutate(rows.length)
  }

  const cards: MetricCardItem[] = [
    { key: "people", title: t("usrPeople"), value: people.filter((u) => u.status === "active").length, footer: { icon: Users, text: t("usrPeopleHint", { companies: new Set(people.map((u) => u.customerId)).size }) } },
    { key: "2fa", title: t("stf2fa"), value: `${people.filter((u) => u.twoFactor && u.status === "active").length} / ${people.filter((u) => u.status === "active").length}`, footer: { icon: ShieldCheck, text: t("usr2faHint") } },
    { key: "suspended", title: t("usrSuspended"), value: people.filter((u) => u.status === "suspended").length, valueClassName: "text-destructive", footer: { icon: UserX, text: t("usrSuspendedHint") } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={canExport ? <Button variant="outline" onClick={() => setExporting(true)} disabled={rows.length === 0}><DownloadIcon className="size-4" />{t("usrExport")}</Button> : undefined} />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-3" />
      <StepUpDialog open={exporting} onOpenChange={setExporting} action={t("usrExportConfirm", { count: rows.length })} onConfirmed={doExport} />
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Input className="w-full sm:w-72" placeholder={t("usrSearch")} aria-label={t("usrSearch")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label={t("status")}><SelectValue>{status === ALL ? t("pfAllStatuses") : t(`usrStatus_${status}`)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("pfAllStatuses")}</SelectItem>
              {(["active", "suspended", "inactive"] as const).map((s) => <SelectItem key={s} value={s}>{t(`usrStatus_${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={t("usrEmpty")} hint={t("audEmptyHint")} />
        ) : (
          <TableContainer>
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("usrPerson")}</TableHead>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("usrCompanyRole")}</TableHead>
                  <TableHead>{t("stf2faCol")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("stfLastSignIn")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell><Link href={`/dashboard/platform/${u.customerId}`} className="hover:underline">{u.company}</Link></TableCell>
                    <TableCell>{t(u.companyRole === "owner" ? "usrRoleAdmin" : "usrRoleMember")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-transparent", u.twoFactor ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground")}>{t(u.twoFactor ? "stf2faOn" : "stf2faOff")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[u.status])}>{t(`usrStatus_${u.status}`)}</Badge>
                      {u.suspension && <span className="block max-w-56 truncate text-xs text-muted-foreground" title={u.suspension.reason}>{u.suspension.reason}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{when(u.lastSignInAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canReset && u.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => setReset(u)}><Mail className="size-4" />{t("usrReset")}</Button>
                        )}
                        {canSuspend && u.status === "active" && (
                          <Button size="sm" variant="ghost" aria-label={t("usrSuspendName", { name: u.name })} onClick={() => setTarget(u)}><Ban className="size-4" /></Button>
                        )}
                        {u.status === "suspended" && <Button size="sm" variant="ghost" asChild><Link href="/dashboard/banned-users">{t("usrSeeSuspension")}</Link></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("usrRule")}</p>
      </section>

      <ConfirmAlertDialog
        open={!!reset}
        onOpenChange={(v) => !v && setReset(null)}
        title={t("usrResetTitle")}
        description={reset ? t("usrResetConfirm", { name: reset.name, email: reset.email }) : ""}
        confirmLabel={t("usrSendReset")}
        onConfirm={() => {
          if (reset) m.passwordReset.mutate(reset)
          setReset(null)
        }}
      />
      <DataTableEntityFormSheet
        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
        mode="create"
        createTitle={target ? t("usrSuspendName", { name: target.name }) : ""}
        editTitle=""
        description={t("usrSuspendDesc")}
        isSubmitting={m.suspendUser.isPending}
        submitLabel={{ create: t("cuSuspend") }}
        onSubmit={() => (needsStepUp(actor?.role, C.SUSPEND) ? setStepUp(true) : target && m.suspendUser.mutate({ user: target, ...form, until: form.until || undefined }))}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="us-reason">{t("cuReason")}</Label>
            <Textarea id="us-reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="us-until">{t("cuUntilOptional")}</Label>
            <Input id="us-until" type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} />
          </div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("usrSuspendNote")}</p>
        </div>
      </DataTableEntityFormSheet>
      <StepUpDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={target ? t("usrStepUp", { name: target.name, company: target.company }) : ""}
        onConfirmed={() => {
          if (target) m.suspendUser.mutate({ user: target, reason: form.reason, until: form.until || undefined }, { onSuccess: () => { setTarget(null); setForm({ reason: "", until: "" }) } })
        }}
      />
    </div>
  )
}
