"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Mail, ShieldCheck, ShieldUser, Trash, UserPlus, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor, useConsoleMutations, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { canManageStaff, needsStepUp } from "@/lib/platform/console-roles"
import { inviteExpired } from "@/lib/platform/session-policy"
import { CONSOLE_ROLES, ConsoleCapability, ConsoleRole, type PlatformStaff } from "@/types/platform-console"
import { ROLE_LABEL, RoleBadge, StepUpDialog } from "./console-shared"

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canInvite ? <Button onClick={() => setInviteOpen(true)}><UserPlus className="size-4" />{t("stfInvite")}</Button> : undefined}
      />
      <MetricCardGrid cards={cards} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("stfListTitle")}</h2>
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("stfMember")}</TableHead>
                  <TableHead>{t("stfRole")}</TableHead>
                  <TableHead>{t("stf2faCol")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("stfLastSignIn")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const manageable = !!actor && s.id !== actor.id && canManageStaff(actor.role, s.role)
                  const expired = inviteExpired(s)
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <SpaceAvatar name={s.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.name}{actor?.id === s.id && <span className="ms-2 text-xs text-muted-foreground">({t("stfYou")})</span>}</p>
                            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {manageable && roleChoices(s.role).length > 1 ? (
                          <Select value={s.role} onValueChange={(v) => start({ kind: "role", staff: s, role: v as ConsoleRole })}>
                            <SelectTrigger className="h-8 w-44" aria-label={t("stfRoleOf", { name: s.name })}><SelectValue>{t(ROLE_LABEL[s.role])}</SelectValue></SelectTrigger>
                            <SelectContent>
                              {roleChoices(s.role).map((r) => <SelectItem key={r} value={r}>{t(ROLE_LABEL[r])}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <RoleBadge role={s.role} />
                        )}
                      </TableCell>
                      <TableCell>
                        {s.twoFactor ? (
                          <Badge variant="outline" className="border-transparent bg-success-soft text-success-foreground">{t("stf2faOn")}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("stf2faOff")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.status === "invited" ? (
                          <span className="text-sm">
                            {expired ? t("stfInviteExpired") : t("stfInvitedUntil", { date: when(s.inviteExpiresAt) })}
                          </span>
                        ) : (
                          <span className="text-sm">{t("stfActive")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{when(s.lastSignInAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {manageable && s.status === "invited" && (
                            <Button size="sm" variant="outline" onClick={() => m.resend.mutate(s.id)}><Clock className="size-4" />{t("stfResend")}</Button>
                          )}
                          {manageable && (
                            <Button size="sm" variant="ghost" aria-label={t("stfRemoveName", { name: s.name })} onClick={() => start({ kind: "remove", staff: s })}><Trash className="size-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("stfRule")}</p>
      </section>

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
