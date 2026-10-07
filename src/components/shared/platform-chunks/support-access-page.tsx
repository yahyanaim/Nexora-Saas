"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, DoorOpen, Eye, Plus, ShieldCheck, X } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link, useRouter } from "@/i18n/navigation"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useSupportDeskMutations, useSupportSessions } from "@/hooks/platform/use-platform-support"
import { consoleCan } from "@/lib/platform/console-roles"
import { sessionLive } from "@/lib/platform/support-rules"
import { useWorkspaceStore } from "@/store/workspace-store"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { SupportSession } from "@/types/platform-support"
import { Panel } from "./billing-shared"
import { StepUpDialog } from "./console-shared"
import { SessionRequestSheet, type SessionDraft } from "./session-request-sheet"
import { SessionStateBadge, minutesLeft, useDuration, useSupportFormat } from "./support-shared"

/**
 * Support sessions: the only way into a customer's business data (SUP-03 to
 * SUP-09). Asked by an agent, approved by the customer, limited in time.
 */
export default function ConsoleSupportAccessPage() {
  const t = useTranslations()
  const { dateTime, time } = useSupportFormat()
  const duration = useDuration()
  const router = useRouter()
  const setWorkspace = useWorkspaceStore((s) => s.setCurrent)
  const actor = useConsoleActor()
  const { data: sessions = [], isLoading } = useSupportSessions()
  const m = useSupportDeskMutations()
  const [now] = useState(() => new Date())
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const [approving, setApproving] = useState<SupportSession | null>(null)
  const canAsk = consoleCan(actor?.role, C.SUPPORT_SESSION)
  const isOwner = actor?.role === ConsoleRole.OWNER
  const canEnd = (s: SupportSession) => !!actor && (s.agentId === actor.id || actor.role === ConsoleRole.OWNER || actor.role === ConsoleRole.ADMIN)
  const state = (s: SupportSession) => sessionLive(s, now)

  const cards: MetricCardItem[] = [
    { key: "active", title: t("saActive"), value: sessions.filter((s) => state(s) === "active").length, footer: { icon: Eye, text: t("saActiveHint") } },
    { key: "waiting", title: t("saWaiting"), value: sessions.filter((s) => state(s) === "waiting_approval").length, footer: { icon: Clock, text: t("saWaitingHint") } },
    { key: "owner", title: t("saOwner"), value: sessions.filter((s) => state(s) === "waiting_owner" || (s.scope === "write" && s.status === "requested" && !s.ownerApprovedBy)).length, footer: { icon: ShieldCheck, text: t("saOwnerHint") } },
  ]

  const timeCell = (s: SupportSession) => {
    const st = state(s)
    if (st === "active") return <><span className="font-medium">{t("sesMinutesLeft", { n: minutesLeft(s, now) })}</span><span className="block text-xs text-muted-foreground">{t("saUntil", { time: time(s.endsAt) })}</span></>
    if (st === "waiting_approval" || st === "waiting_owner") return <><span>{t("saAsked", { duration: duration(s.minutes) })}</span><span className="block text-xs text-muted-foreground">{dateTime(s.requestedAt)}</span></>
    return <><span>{duration(s.minutes)}</span><span className="block text-xs text-muted-foreground">{dateTime(s.endedAt ?? s.endsAt ?? s.decidedAt ?? s.requestedAt)}</span></>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={canAsk ? <Button onClick={() => setDraft({})}><Plus className="size-4" />{t("sesNew")}</Button> : undefined} />
      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-3" />
      <Panel title={t("saList")} hint={t("saListHint")}>
        {isLoading ? <ListSkeleton /> : sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("saEmpty")}</p>
        ) : (
          <TableContainer>
            <Table className="min-w-[64rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("saAgent")}</TableHead>
                  <TableHead>{t("sesReason")}</TableHead>
                  <TableHead>{t("sesScope")}</TableHead>
                  <TableHead>{t("saTime")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const st = state(s)
                  const ownerNeeded = s.scope === "write" && !s.ownerApprovedBy && (s.status === "requested" || s.status === "approved")
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Link href={`/dashboard/platform/${s.customerId}`} className="font-medium hover:underline">{s.customerName}</Link>{s.requestNumber && <span className="block text-xs text-muted-foreground">{t("saAbout", { number: s.requestNumber })}</span>}</TableCell>
                      <TableCell className="text-sm">{s.agentName}{s.pagesViewed > 0 && <span className="block text-xs text-muted-foreground">{t("sesPages", { n: s.pagesViewed })}</span>}</TableCell>
                      <TableCell className="max-w-72 text-sm">{s.reason}</TableCell>
                      <TableCell className="text-sm">{t(s.scope === "read" ? "sesScopeRead" : "sesScopeWrite")}{s.ownerApprovedBy && <span className="block text-xs text-muted-foreground">{t("saOwnerBy", { name: s.ownerApprovedBy })}</span>}</TableCell>
                      <TableCell className="text-sm">{timeCell(s)}</TableCell>
                      <TableCell><SessionStateBadge session={s} now={now} />{s.decidedBy && <span className="mt-1 block text-xs text-muted-foreground">{t(s.status === "refused" ? "saRefusedBy" : "saApprovedBy", { name: s.decidedBy })}</span>}{s.endedBy && <span className="block text-xs text-muted-foreground">{t("saEndedBy", { name: s.endedBy })}</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {st === "active" && actor?.id === s.agentId && s.tenantWorkspaceId && (
                            <Button size="sm" onClick={() => { setWorkspace(s.tenantWorkspaceId!); router.push("/dashboard/my-work") }}><DoorOpen className="size-4" />{t("saOpen")}</Button>
                          )}
                          {isOwner && ownerNeeded && actor?.id !== s.agentId && (
                            <Button size="sm" variant="outline" onClick={() => setApproving(s)}><ShieldCheck className="size-4" />{t("saOwnerApprove")}</Button>
                          )}
                          {["waiting_approval", "waiting_owner", "active"].includes(st) && canEnd(s) && (
                            <Button size="sm" variant="outline" onClick={() => m.end.mutate(s.id)}><X className="size-4" />{t("saEnd")}</Button>
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
        <p className="mt-3 text-xs text-muted-foreground">{t("saNote")}</p>
      </Panel>

      <SessionRequestSheet key={draft ? "open" : "none"} draft={draft} onClose={() => setDraft(null)} />
      <StepUpDialog
        open={!!approving}
        onOpenChange={(v) => !v && setApproving(null)}
        action={approving ? t("saOwnerStepUp", { agent: approving.agentName, company: approving.customerName }) : ""}
        onConfirmed={() => approving && m.ownerApprove.mutate(approving.id)}
      />
    </div>
  )
}
