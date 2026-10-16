"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Ban, DownloadIcon, Eye, Mail, ShieldCheck, UserX, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { DataTableRowActions, type RowAction } from "@/components/shared/data-table-chunks/data-table-row-actions"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link, useRouter } from "@/i18n/navigation"
import { useConsoleActor, useConsoleDirectory, useConsoleMutations, useRecordDirectoryExport } from "@/hooks/platform/use-platform-console"
import { exportToCsv } from "@/lib/utils/export-data"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import type { DirectoryUser } from "@/lib/api/platform-customers-api"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import { StepUpDialog } from "./console-shared"
import { NameCell, inSelection, searchIn, sortHeader } from "./console-table"

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
  const router = useRouter()
  const [reset, setReset] = useState<DirectoryUser | null>(null)
  const [target, setTarget] = useState<DirectoryUser | null>(null)
  const [form, setForm] = useState({ reason: "", until: "" })
  const [stepUp, setStepUp] = useState(false)
  // the rows shown when the export was asked for (after search and filters)
  const [exporting, setExporting] = useState<DirectoryUser[] | null>(null)
  const recordExport = useRecordDirectoryExport()

  const canSuspend = consoleCan(actor?.role, C.SUSPEND)
  // USR-08: platform owners only, with the authenticator code; the export is in the audit trail (AUD-07)
  const canExport = consoleCan(actor?.role, C.EXPORT_AUDIT)
  const canReset = !!actor && [ConsoleRole.OWNER, ConsoleRole.ADMIN, ConsoleRole.SUPPORT].includes(actor.role)
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)) : "—")
  const columns = useMemo<ColumnDef<DirectoryUser>[]>(() => [
    {
      id: "name",
      accessorFn: (u) => u.name,
      header: sortHeader(t("usrPerson")),
      filterFn: searchIn<DirectoryUser>((u) => [u.name, u.email, u.company]),
      cell: ({ row: { original: u } }) => <NameCell name={u.name} sub={u.email} />,
    },
    { id: "company", accessorFn: (u) => u.company, header: sortHeader(t("pfCompany")), cell: ({ row: { original: u } }) => <Link href={`/dashboard/platform/${u.customerId}`} className="hover:underline">{u.company}</Link> },
    { id: "role", accessorFn: (u) => u.companyRole, header: sortHeader(t("usrCompanyRole")), filterFn: inSelection, cell: ({ row: { original: u } }) => t(u.companyRole === "owner" ? "usrRoleAdmin" : "usrRoleMember") },
    {
      id: "twoFactor",
      accessorFn: (u) => (u.twoFactor ? "on" : "off"),
      header: sortHeader(t("stf2faCol")),
      filterFn: inSelection,
      cell: ({ row: { original: u } }) => <Badge variant="outline" className={cn("border-transparent", u.twoFactor ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground")}>{t(u.twoFactor ? "stf2faOn" : "stf2faOff")}</Badge>,
    },
    {
      id: "status",
      accessorFn: (u) => u.status,
      header: sortHeader(t("status")),
      filterFn: inSelection,
      cell: ({ row: { original: u } }) => (
        <span>
          <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[u.status])}>{t(`usrStatus_${u.status}`)}</Badge>
          {u.suspension && <span className="block max-w-56 truncate text-xs text-muted-foreground" title={u.suspension.reason}>{u.suspension.reason}</span>}
        </span>
      ),
    },
    { id: "last", accessorFn: (u) => u.lastSignInAt ?? "", header: sortHeader(t("stfLastSignIn")), cell: ({ row: { original: u } }) => <span className="text-sm text-muted-foreground">{when(u.lastSignInAt)}</span> },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row: { original: u } }) => {
        const actions: RowAction<DirectoryUser>[] = [{ label: t("cuOpenAccount"), icon: Eye, onClick: () => router.push(`/dashboard/platform/${u.customerId}`) }]
        if (canReset && u.status === "active") actions.push({ label: t("usrReset"), icon: Mail, onClick: setReset })
        if (canSuspend && u.status === "active") actions.push({ label: t("cuSuspend"), icon: Ban, onClick: setTarget, variant: "destructive", separatorBefore: true })
        if (u.status === "suspended") actions.push({ label: t("usrSeeSuspension"), icon: UserX, onClick: () => router.push("/dashboard/banned-users") })
        return <DataTableRowActions row={u} actions={actions} />
      },
    },
  // the formatters only change with the language
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, locale, canReset, canSuspend])

  const doExport = (rows: DirectoryUser[]) => {
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
      <PageHeader />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-3" />
      <StepUpDialog open={!!exporting} onOpenChange={(v) => !v && setExporting(null)} action={t("usrExportConfirm", { count: exporting?.length ?? 0 })} onConfirmed={() => exporting && doExport(exporting)} />
      <DataTable
        title={t("users")}
        isLoading={isLoading}
        columns={columns}
        data={people}
        searchColumnId="name"
        searchPlaceholder={t("usrSearch")}
        emptyMessage={t("usrEmpty")}
        defaultSorting={[{ id: "name", desc: false }]}
        showRange savedViewsKey="console-directory"
        // USR-08: platform owners only, with the authenticator code, audited (AUD-07)
        enableExport={canExport}
        exportOptions={[{ label: t("usrExport"), icon: DownloadIcon, onClick: (rows) => rows.length && setExporting(rows as DirectoryUser[]) }]}
        filters={[
          { columnId: "status", title: t("status"), options: (["active", "suspended", "inactive"] as const).map((s) => ({ value: s, label: t(`usrStatus_${s}`) })) },
          { columnId: "role", title: t("usrCompanyRole"), options: [{ value: "owner", label: t("usrRoleAdmin") }, { value: "member", label: t("usrRoleMember") }] },
          { columnId: "twoFactor", title: t("stf2faCol"), options: [{ value: "on", label: t("stf2faOn") }, { value: "off", label: t("stf2faOff") }] },
        ]}
      />
      <p className="text-xs text-muted-foreground">{t("usrRule")}</p>

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
