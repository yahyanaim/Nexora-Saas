"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, MonitorSmartphone, PowerOff, ShieldAlert } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useConsoleActor, useConsoleMutations, useConsoleSessions, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { canRevokeSessions } from "@/lib/platform/console-roles"
import { sessionState } from "@/lib/platform/session-policy"
import { cn } from "@/lib/utils"
import type { SessionState, StaffSession } from "@/types/platform-console"

const STATE: Record<SessionState, { key: string; className: string }> = {
  active: { key: "sesActive", className: "bg-success-soft text-success-foreground" },
  idle_expired: { key: "sesIdle", className: "bg-muted text-muted-foreground" },
  expired: { key: "sesExpired", className: "bg-muted text-muted-foreground" },
  revoked: { key: "sesRevokedState", className: "bg-danger-soft text-destructive" },
}

/** Every console session of the team, with revocation (STF-05) and the timeouts of STF-06. */
export default function ConsoleSessionsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const actor = useConsoleActor()
  const { data: sessions = [], isLoading } = useConsoleSessions()
  const { data: staff = [] } = useConsoleStaff()
  const m = useConsoleMutations()
  const [pending, setPending] = useState<StaffSession | null>(null)
  const name = (id: string) => staff.find((s) => s.id === id)?.name ?? t("sesFormerMember")
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  const rows = sessions.map((s) => ({ ...s, state: sessionState(s) }))
  const live = rows.filter((s) => s.state === "active")
  const foreign = live.filter((s) => !s.location.endsWith(", MA"))

  const cards: MetricCardItem[] = [
    { key: "active", title: t("sesActiveCount"), value: live.length, valueClassName: "text-success", footer: { icon: MonitorSmartphone, text: t("sesActiveHint") } },
    { key: "policy", title: t("sesPolicy"), value: t("sesPolicyValue"), footer: { icon: Clock, text: t("sesPolicyHint") } },
    { key: "foreign", title: t("sesForeign"), value: foreign.length, valueClassName: foreign.length ? "text-warning-foreground" : undefined, footer: { icon: ShieldAlert, text: t("sesForeignHint") } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-3" />
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("sesListTitle")}</h2>
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("stfMember")}</TableHead>
                  <TableHead>{t("sesDevice")}</TableHead>
                  <TableHead>{t("sesLocation")}</TableHead>
                  <TableHead>{t("sesStarted")}</TableHead>
                  <TableHead>{t("sesLastActivity")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const mine = s.staffId === actor?.id
                  const canRevoke = s.state === "active" && !!actor && (mine || canRevokeSessions(actor.role))
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{name(s.staffId)}{mine && <span className="ms-2 text-xs text-muted-foreground">({t("stfYou")})</span>}</TableCell>
                      <TableCell>{s.device}</TableCell>
                      <TableCell>
                        {s.location}
                        <span className="block text-xs text-muted-foreground tabular-nums">{s.ip}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{when(s.startedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{when(s.lastActivityAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-transparent", STATE[s.state].className)}>{t(STATE[s.state].key)}</Badge>
                        {s.revokedBy && <span className="block text-xs text-muted-foreground">{t("sesBy", { name: s.revokedBy })}</span>}
                      </TableCell>
                      <TableCell>
                        {canRevoke && (
                          <Button size="sm" variant="outline" onClick={() => setPending(s)}><PowerOff className="size-4" />{t("sesRevoke")}</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>
      <ConfirmAlertDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title={t("sesRevokeTitle")}
        description={pending ? t("sesRevokeConfirm", { name: name(pending.staffId), device: pending.device }) : ""}
        confirmLabel={t("sesRevoke")}
        destructive
        onConfirm={() => {
          if (pending) m.revoke.mutate(pending.id)
          setPending(null)
        }}
      />
    </div>
  )
}
