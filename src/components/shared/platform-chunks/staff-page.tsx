"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Mail, ShieldCheck, ShieldUser, Trash, UserPlus, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { DataTableRowActions, type RowAction } from "@/components/shared/data-table-chunks/data-table-row-actions"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor, useConsoleMutations, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { canManageStaff, needsStepUp } from "@/lib/platform/console-roles"
import { inviteExpired } from "@/lib/platform/session-policy"
import { CONSOLE_ROLES, ConsoleCapability, ConsoleRole, type PlatformStaff } from "@/types/platform-console"
import { ROLE_LABEL, RoleBadge, StepUpDialog } from "./console-shared"
import { NameCell, inSelection, searchIn, sortHeader } from "./console-table"

type Pending = { kind: "role"; staff: PlatformStaff; role: ConsoleRole } | { kind: "remove"; staff: PlatformStaff } | { kind: "invite" }

/** The Nexora team only, with console role and two-factor status (STF-01 to STF-07). */

export default function ConsoleStaffPage() {
  const t = useTranslations()
  const locale = useLocale()
  const actor = useConsoleActor()
  const { data: staff = [], isLoading } = useConsoleStaff()
  const m = useConsoleMutations()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", role: ConsoleRole.SUPPORT })
  const [pending, setPending] = useState<Pending | null>(null)
  const [stepUp, setStepUp] = useState(false)

  const canInvite = !!actor && canManageStaff(actor.role, ConsoleRole.READ_ONLY)
  const stepUpNeeded = needsStepUp(actor?.role, ConsoleCapability.MANAGE_STAFF)
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—")
  const roleChoices = (target: ConsoleRole) => CONSOLE_ROLES.filter((r) => actor && canManageStaff(actor.role, target, r))

  const active = staff.filter((s) => s.status === "active")
  const cards: MetricCardItem[] = [
    { key: "team", title: t("stfTeam"), value: active.length, footer: { icon: Users, text: t("stfTeamHint") } },
    { key: "2fa", title: t("stf2fa"), value: `${active.filter((s) => s.twoFactor).length} / ${active.length}`, valueClassName: active.every((s) => s.twoFactor) ? "text-success" : "text-warning-foreground", footer: { icon: ShieldCheck, text: t("stf2faHint") } },
    { key: "invites", title: t("stfInvites"), value: staff.filter((s) => s.status === "invited").length, footer: { icon: Mail, text: t("stfInvitesHint") } },
    { key: "owners", title: t("stfOwners"), value: active.filter((s) => s.role === ConsoleRole.OWNER).length, footer: { icon: ShieldUser, text: t("stfOwnersHint") } },
  ]

  // UX-02 / UX-03: every change is confirmed, and the second factor is asked when the role needs it
  const confirmText = (p: Pending) =>
    p.kind === "role"
      ? t("stfConfirmRole", { name: p.staff.name, from: t(ROLE_LABEL[p.staff.role]), to: t(ROLE_LABEL[p.role]) })
      : p.kind === "remove"
        ? t("stfConfirmRemove", { name: p.staff.name })
        : t("stfConfirmInvite", { name: form.name, role: t(ROLE_LABEL[form.role]) })
  const execute = (p: Pending) => {
    if (p.kind === "role") m.changeRole.mutate({ id: p.staff.id, role: p.role })
    else if (p.kind === "remove") m.remove.mutate(p.staff.id)
    else m.invite.mutate(form, { onSuccess: () => { setInviteOpen(false); setForm({ name: "", email: "", role: ConsoleRole.SUPPORT }) } })
  }
  const start = (p: Pending) => {
    setPending(p)
    if (stepUpNeeded) setStepUp(true)
  }

  const columns = useMemo<ColumnDef<PlatformStaff>[]>(() => [
    {
      id: "name",
      accessorFn: (s) => s.name,
      header: sortHeader(t("stfMember")),
      filterFn: searchIn<PlatformStaff>((s) => [s.name, s.email]),
      cell: ({ row: { original: s } }) => <NameCell name={actor?.id === s.id ? `${s.name} (${t("stfYou")})` : s.name} sub={s.email} avatar={s.avatar} />,
    },
    {
      id: "role",
      accessorFn: (s) => s.role,
      header: sortHeader(t("stfRole")),
      filterFn: inSelection,
      cell: ({ row: { original: s } }) => {
        const manageable = !!actor && s.id !== actor.id && canManageStaff(actor.role, s.role)
        return manageable && roleChoices(s.role).length > 1 ? (
          <Select value={s.role} onValueChange={(v) => start({ kind: "role", staff: s, role: v as ConsoleRole })}>
            <SelectTrigger className="h-8 w-44" aria-label={t("stfRoleOf", { name: s.name })}><SelectValue>{t(ROLE_LABEL[s.role])}</SelectValue></SelectTrigger>
            <SelectContent>{roleChoices(s.role).map((r) => <SelectItem key={r} value={r}>{t(ROLE_LABEL[r])}</SelectItem>)}</SelectContent>
          </Select>
        ) : <RoleBadge role={s.role} />
      },
    },
    {
      id: "twoFactor",
      accessorFn: (s) => (s.twoFactor ? "on" : "off"),
      header: sortHeader(t("stf2faCol")),
      filterFn: inSelection,
      cell: ({ row: { original: s } }) => s.twoFactor
        ? <Badge variant="outline" className="border-transparent bg-success-soft text-success-foreground">{t("stf2faOn")}</Badge>
        : <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("stf2faOff")}</Badge>,
    },
    {
      id: "status",
      accessorFn: (s) => s.status,
      header: sortHeader(t("status")),
      filterFn: inSelection,
      cell: ({ row: { original: s } }) => <span className="text-sm">{s.status === "invited" ? (inviteExpired(s) ? t("stfInviteExpired") : t("stfInvitedUntil", { date: when(s.inviteExpiresAt) })) : t("stfActive")}</span>,
    },
    { id: "last", accessorFn: (s) => s.lastSignInAt ?? "", header: sortHeader(t("stfLastSignIn")), cell: ({ row: { original: s } }) => <span className="text-sm text-muted-foreground">{when(s.lastSignInAt)}</span> },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row: { original: s } }) => {
        const manageable = !!actor && s.id !== actor.id && canManageStaff(actor.role, s.role)
        if (!manageable) return null
        const actions: RowAction<PlatformStaff>[] = []
        if (s.status === "invited") actions.push({ label: t("stfResend"), icon: Clock, onClick: (x) => m.resend.mutate(x.id) })
        actions.push({ label: t("stfRemoveName", { name: s.name }), icon: Trash, variant: "destructive", separatorBefore: actions.length > 0, onClick: (x) => start({ kind: "remove", staff: x }) })
        return <DataTableRowActions row={s} actions={actions} />
      },
    },
  // the formatters only change with the language and who is signed in
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, locale, actor, stepUpNeeded])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} />

      <DataTable
        title={t("stfListTitle")}
        isLoading={isLoading}
        columns={columns}
        data={staff}
        searchColumnId="name"
        searchPlaceholder={t("stfSearch")}
        emptyMessage={t("stfEmpty")}
        defaultSorting={[{ id: "name", desc: false }]}
        showRange savedViewsKey="console-staff"
        exportFilename="nexora-team"
        getExportData={() => staff.map((s) => ({ name: s.name, email: s.email, role: t(ROLE_LABEL[s.role]), twoFactor: s.twoFactor ? "yes" : "no", status: s.status, lastSignIn: s.lastSignInAt ?? "" }))}
        actions={canInvite ? [{ label: t("stfInvite"), icon: UserPlus, onClick: () => setInviteOpen(true), variant: "primary", iconOnly: true }] : []}
        filters={[
          { columnId: "role", title: t("stfRole"), options: CONSOLE_ROLES.map((r) => ({ value: r, label: t(ROLE_LABEL[r]) })) },
          { columnId: "twoFactor", title: t("stf2faCol"), options: [{ value: "on", label: t("stf2faOn") }, { value: "off", label: t("stf2faOff") }] },
          { columnId: "status", title: t("status"), options: [{ value: "active", label: t("stfActive") }, { value: "invited", label: t("stfStatusInvited") }] },
        ]}
      />
      <p className="text-xs text-muted-foreground">{t("stfRule")}</p>

      <DataTableEntityFormSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        mode="create"
        createTitle={t("stfInvite")}
        editTitle={t("stfInvite")}
        description={t("stfInviteDesc")}
        isSubmitting={m.invite.isPending}
        submitLabel={{ create: t("stfSendInvite") }}
        onSubmit={() => start({ kind: "invite" })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stf-name">{t("name")}</Label>
            <Input id="stf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stf-email">{t("email")}</Label>
            <Input id="stf-email" type="email" placeholder="name@nexora.io" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stf-role">{t("stfRole")}</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as ConsoleRole })}>
              <SelectTrigger id="stf-role"><SelectValue>{t(ROLE_LABEL[form.role])}</SelectValue></SelectTrigger>
              <SelectContent>
                {CONSOLE_ROLES.filter((r) => actor && canManageStaff(actor.role, r, r)).map((r) => <SelectItem key={r} value={r}>{t(ROLE_LABEL[r])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("stfInviteNote")}</p>
        </div>
      </DataTableEntityFormSheet>

      <StepUpDialog
        open={stepUp}
        onOpenChange={(v) => {
          setStepUp(v)
          // onConfirmed still sees this render's `pending`
          if (!v) setPending(null)
        }}
        action={pending ? confirmText(pending) : ""}
        onConfirmed={() => {
          if (pending) execute(pending)
          setPending(null)
        }}
      />
      <ConfirmAlertDialog
        open={!!pending && !stepUpNeeded}
        onOpenChange={(v) => !v && setPending(null)}
        title={t("stfConfirmTitle")}
        description={pending ? confirmText(pending) : ""}
        destructive={pending?.kind === "remove"}
        onConfirm={() => {
          if (pending) execute(pending)
          setPending(null)
        }}
      />
    </div>
  )
}
