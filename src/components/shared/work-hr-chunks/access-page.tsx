"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Clock, KeyRound, Send, Users, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { changeAccessRoleApi, inviteEmployeeApi, listAccountsApi, setAccountEnabledApi } from "@/lib/api/access-api"
import { getWorkspaceSubscriptionApi } from "@/lib/api/workspace-subscription-api"
import { seatsUsed } from "@/lib/workforce/access"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { AccountStatus } from "@/types/work-access"
import { EmployeeStatus, WORK_ROLES, WorkRole } from "@/types/workforce"
import { WORK_ROLE_LABEL } from "../workforce-chunks/workforce-labels"
import { translateError } from "@/lib/errors/translate-error"

const STATUS_CLASS: Record<AccountStatus | "none", string> = {
  [AccountStatus.ACTIVE]: "bg-success-soft text-success-foreground border-transparent",
  [AccountStatus.INVITED]: "bg-info-soft text-info-foreground border-transparent",
  [AccountStatus.DISABLED]: "bg-muted text-muted-foreground border-transparent",
  none: "bg-muted/60 text-muted-foreground border-transparent",
}

/** What each work role can do, in plain words (from WORK_ROLE_PERMISSIONS). */
const ROLE_RIGHTS: Record<WorkRole, string[]> = {
  [WorkRole.ADMIN]: ["rightEverything"],
  [WorkRole.MANAGER]: ["rightProjects", "rightClients", "rightTime", "rightApprove", "rightAnalytics"],
  [WorkRole.ACCOUNTANT]: ["rightInvoices", "rightClients", "rightCosts", "rightAnalytics"],
  [WorkRole.EMPLOYEE]: ["rightOwnTime", "rightProjectsRead"],
  [WorkRole.CLIENT]: ["rightClientPortal"],
}

/** Who can sign in to the company, and with which role (ACC-1…ACC-4). */
export default function AccessPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const { data: employees = [], isLoading: l1 } = useEmployees()
  const { data: accounts = [], isLoading: l2 } = useQuery({ queryKey: ["accounts", ws], queryFn: () => listAccountsApi(ws) })
  const { data: sub } = useQuery({ queryKey: ["subscription", ws], queryFn: () => getWorkspaceSubscriptionApi(ws) })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["accounts", ws] })
    qc.invalidateQueries({ queryKey: ["employees", ws] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  const invite = useMutation({ mutationFn: (id: string) => inviteEmployeeApi(ws, id), onSuccess: () => { toast.success(t("accessInvited")); refresh() }, onError })
  const toggle = useMutation({ mutationFn: ({ id, on }: { id: string; on: boolean }) => setAccountEnabledApi(ws, id, on), onSuccess: () => { toast.success(t("accessUpdated")); refresh() }, onError })
  const role = useMutation({ mutationFn: ({ id, value }: { id: string; value: WorkRole }) => changeAccessRoleApi(ws, id, value), onSuccess: () => { toast.success(t("accessRoleChanged")); refresh() }, onError })

  const rows = useMemo(
    () =>
      employees
        .map((e) => ({ employee: e, account: accounts.find((a) => a.employeeId === e.id) }))
        .filter((r) => r.employee.status !== EmployeeStatus.INACTIVE || r.account)
        .sort((a, b) => Number(!a.account) - Number(!b.account) || a.employee.name.localeCompare(b.employee.name)),
    [employees, accounts]
  )
  const used = seatsUsed(accounts)
  const seats = sub?.plan.seats ?? -1
  const active = accounts.filter((a) => a.status === AccountStatus.ACTIVE).length
  const invited = accounts.filter((a) => a.status === AccountStatus.INVITED).length
  const without = rows.filter((r) => !r.account || r.account.status === AccountStatus.DISABLED).length
  const date = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)) : "—")

  const cards: MetricCardItem[] = [
    { key: "seats", title: t("accessSeats"), value: seats < 0 ? `${used}` : `${used} / ${seats}`, valueClassName: seats >= 0 && used >= seats ? "text-warning-foreground" : "text-primary", footer: { icon: KeyRound, text: seats < 0 ? t("accessUnlimited") : t("accessSeatsLeft", { count: Math.max(0, seats - used) }) } },
    { key: "active", title: t("accessActive"), value: active, valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("accessActiveHint") } },
    { key: "invited", title: t("accessInvitedCount"), value: invited, footer: { icon: Clock, text: t("accessInvitedHint") } },
    { key: "without", title: t("accessWithout"), value: without, footer: { icon: Users, text: t("accessWithoutHint") } },
  ]
  const busy = invite.isPending || toggle.isPending || role.isPending

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/subscription">{t("mySubscription")}</Link>
          </Button>
        }
      />
      <MetricCardGrid cards={cards} isLoading={l1 || l2} />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5 xl:col-span-2">
          <h2 className="mb-1 text-base font-semibold">{t("accessWhoCanSignIn")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("accessWhoHint")}</p>
          {l1 || l2 ? (
            <ListSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} title={t("noEmployees")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {rows.map(({ employee, account }) => {
                const status = account?.status ?? "none"
                return (
                  <li key={employee.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <SpaceAvatar name={employee.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{employee.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {employee.email}
                        {account?.lastSignInAt ? ` · ${t("accessLastSignIn", { date: date(account.lastSignInAt) })}` : ""}
                      </p>
                    </div>
                    <Select value={employee.role} onValueChange={(v) => role.mutate({ id: employee.id, value: v as WorkRole })}>
                      <SelectTrigger className="w-40 bg-card" aria-label={t("role")} disabled={busy}>
                        <SelectValue>{t(WORK_ROLE_LABEL[employee.role])}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>{WORK_ROLES.map((r) => <SelectItem key={r} value={r}>{t(WORK_ROLE_LABEL[r])}</SelectItem>)}</SelectContent>
                    </Select>
                    <Badge variant="outline" className={cn("w-24 justify-center", STATUS_CLASS[status])}>{t(`access_${status}`)}</Badge>
                    <div className="flex w-36 justify-end">
                      {!account || account.status === AccountStatus.DISABLED ? (
                        <Button size="sm" disabled={busy || employee.status === EmployeeStatus.INACTIVE} onClick={() => invite.mutate(employee.id)}>
                          <Send className="size-4" /> {t("accessGive")}
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          {account.status === AccountStatus.INVITED && (
                            <Button variant="ghost" size="sm" disabled={busy} aria-label={t("accessResend")} onClick={() => invite.mutate(employee.id)}>
                              <Send className="size-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" disabled={busy} onClick={() => toggle.mutate({ id: employee.id, on: false })}>
                            <XCircle className="size-4" /> {t("accessRemove")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-1 text-base font-semibold">{t("accessRolesTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("accessRolesHint")}</p>
          <ul className="flex flex-col gap-3">
            {WORK_ROLES.map((r) => (
              <li key={r} className="rounded-2xl border border-border p-3">
                <p className="text-sm font-medium">{t(WORK_ROLE_LABEL[r])}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {ROLE_RIGHTS[r].map((right) => (
                    <li key={right} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t(right)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("accessDemoHint")}</p>
        </section>
      </div>
    </div>
  )
}
