"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronDown, Plus, X } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCompanySupport, useCompanySupportMutations } from "@/hooks/platform/use-platform-support"
import { can } from "@/lib/permissions/can"
import { sessionLive } from "@/lib/platform/support-rules"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import type { SupportCategory, SupportPriority, SupportSession } from "@/types/platform-support"
import { Panel } from "./billing-shared"
import { Conversation, PriorityBadge, SessionStateBadge, SupportStatusBadge, minutesLeft, useDuration, useSupportFormat } from "./support-shared"

const CATEGORIES: SupportCategory[] = ["question", "bug", "billing", "access", "data"]
const PRIORITIES: SupportPriority[] = ["low", "normal", "high", "urgent"]

/**
 * Help & support inside a company's Nexora: ask the Nexora team for help
 * (SUP-01) and, for administrators, answer its requests to open the workspace
 * (SUP-04) or end an open access at any time (SUP-06).
 */
export default function HelpPage() {
  const t = useTranslations()
  const { dateTime, time } = useSupportFormat()
  const duration = useDuration()
  const workspace = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const isAdmin = can(authedUser, P.ROLES_READ)
  const { data, isLoading } = useCompanySupport(workspace.id)
  const m = useCompanySupportMutations(workspace.id)
  const [now] = useState(() => new Date())
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ subject: "", category: "question" as SupportCategory, priority: "normal" as SupportPriority, text: "" })
  const [openId, setOpenId] = useState<string | null>(null)
  const requests = data?.requests ?? []
  const sessions = data?.sessions ?? []
  const linked = !!data?.customer

  const sessionLine = (s: SupportSession) => {
    const st = sessionLive(s, now)
    if (st === "active") return t("helpActiveUntil", { time: time(s.endsAt), n: minutesLeft(s, now) })
    if (st === "waiting_approval") return t("helpAskedAt", { date: dateTime(s.requestedAt) })
    if (st === "waiting_owner") return t("helpWaitingOwner")
    if (s.endedBy) return t("saEndedBy", { name: s.endedBy })
    return s.decidedBy ? t(s.status === "refused" ? "saRefusedBy" : "saApprovedBy", { name: s.decidedBy }) : dateTime(s.requestedAt)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={linked ? <Button onClick={() => setCreating(true)}><Plus className="size-4" />{t("helpNew")}</Button> : undefined} />
      {isLoading ? <ListSkeleton /> : !linked ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("helpNoCustomer")}</p>
      ) : (
        <>
          <Panel title={t("helpAccess")} hint={t("helpAccessHint")}>
            {sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("helpAccessEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {sessions.map((s) => {
                  const st = sessionLive(s, now)
                  return (
                    <li key={s.id} className="flex flex-wrap items-start gap-3 py-3">
                      <div className="w-full min-w-0 space-y-1 sm:w-auto sm:flex-1">
                        <p className="text-sm font-medium">{t("helpAccessAsk", { agent: s.agentName, scope: t(s.scope === "read" ? "sesScopeRead" : "sesScopeWrite").toLowerCase(), duration: duration(s.minutes) })}</p>
                        <p className="text-sm text-muted-foreground">{s.reason}</p>
                        <p className="text-xs text-muted-foreground">{sessionLine(s)}{s.pagesViewed > 0 ? ` · ${t("sesPages", { n: s.pagesViewed })}` : ""}</p>
                      </div>
                      <SessionStateBadge session={s} now={now} />
                      {isAdmin && st === "waiting_approval" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => m.decide.mutate({ id: s.id, approve: true })} disabled={m.decide.isPending}><Check className="size-4" />{t("helpApprove")}</Button>
                          <Button size="sm" variant="outline" onClick={() => m.decide.mutate({ id: s.id, approve: false })} disabled={m.decide.isPending}><X className="size-4" />{t("helpRefuse")}</Button>
                        </div>
                      )}
                      {isAdmin && (st === "active" || st === "waiting_owner") && (
                        <Button size="sm" variant="outline" onClick={() => m.revoke.mutate(s.id)}><X className="size-4" />{t("helpRevoke")}</Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {!isAdmin && <p className="mt-3 text-xs text-muted-foreground">{t("helpAdminOnly")}</p>}
          </Panel>

          <Panel title={t("helpMine")} hint={t("helpMineHint")}>
            {requests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("helpEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => {
                  const expanded = openId === r.id
                  return (
                    <li key={r.id} className="rounded-2xl border border-border">
                      <button type="button" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : r.id)} className="flex w-full flex-wrap items-center gap-3 p-3 text-start">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium"><span className="text-muted-foreground tabular-nums">{r.number}</span> · {r.subject}</span>
                          <span className="block text-xs text-muted-foreground">{t(`supCat_${r.category}`)} · {r.requesterName} · {dateTime(r.updatedAt)}</span>
                        </span>
                        <PriorityBadge priority={r.priority} />
                        <SupportStatusBadge status={r.status} />
                        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                      </button>
                      {expanded && (
                        <div className="border-t border-border p-3">
                          <Conversation request={r} me="customer" sending={m.reply.isPending} onReply={(text, done) => m.reply.mutate({ id: r.id, text }, { onSuccess: done })} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      <DataTableEntityFormSheet
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        createTitle={t("helpNew")}
        editTitle=""
        description={t("helpNewDesc")}
        isSubmitting={m.create.isPending}
        submitLabel={{ create: t("helpSend") }}
        onSubmit={() => m.create.mutate(form, { onSuccess: () => { setCreating(false); setForm({ subject: "", category: "question", priority: "normal", text: "" }) } })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="help-subject">{t("helpSubject")}</Label>
            <Input id="help-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="help-category">{t("helpCategory")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SupportCategory })}>
                <SelectTrigger id="help-category"><SelectValue>{t(`supCat_${form.category}`)}</SelectValue></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`supCat_${c}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="help-priority">{t("helpPriority")}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as SupportPriority })}>
                <SelectTrigger id="help-priority"><SelectValue>{t(`supPr_${form.priority}`)}</SelectValue></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(`supPr_${p}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-text">{t("helpMessage")}</Label>
            <Textarea id="help-text" rows={5} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">{t("helpTargets")}</p>
        </div>
      </DataTableEntityFormSheet>
    </div>
  )
}
