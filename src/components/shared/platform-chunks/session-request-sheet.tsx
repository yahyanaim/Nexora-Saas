"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useSupportDeskMutations } from "@/hooks/platform/use-platform-support"
import { SESSION_DEFAULT_MINUTES } from "@/lib/platform/support-rules"
import { useDuration } from "./support-shared"

const DURATIONS = [15, 30, 60, 120, 240, 480, 1440]

export type SessionDraft = { customerId?: string; requestId?: string; requestNumber?: string; reason?: string }

/**
 * SUP-03: an agent asks a company for access to its workspace, with a reason,
 * a scope (read-only by default) and a duration (60 minutes by default).
 */
export function SessionRequestSheet({ draft, onClose }: { draft: SessionDraft | null; onClose: () => void }) {
  const t = useTranslations()
  const duration = useDuration()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useSupportDeskMutations()
  // the form starts from the draft each time it opens (the parent re-mounts it with a new key)
  const [customerId, setCustomerId] = useState(draft?.customerId ?? "")
  const [reason, setReason] = useState(draft?.reason ?? "")
  const [scope, setScope] = useState<"read" | "write">("read")
  const [minutes, setMinutes] = useState(SESSION_DEFAULT_MINUTES)
  const choices = customers.filter((c) => c.demoWorkspaceId && c.status !== "deleted" && c.status !== "cancelled")

  return (
    <DataTableEntityFormSheet
      open={!!draft}
      onOpenChange={(v) => !v && onClose()}
      mode="create"
      createTitle={draft?.requestNumber ? t("sesNewFor", { number: draft.requestNumber }) : t("sesNew")}
      editTitle=""
      description={t("sesNewDesc")}
      isSubmitting={m.requestSession.isPending}
      submitLabel={{ create: t("sesSend") }}
      onSubmit={() => m.requestSession.mutate({ customerId, requestId: draft?.requestId, reason, scope, minutes }, { onSuccess: onClose })}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ses-customer">{t("pfCompany")}</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger id="ses-customer" disabled={!!draft?.customerId}><SelectValue placeholder={t("sesPickCompany")}>{customers.find((c) => c.id === customerId)?.name}</SelectValue></SelectTrigger>
            <SelectContent>{choices.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ses-reason">{t("sesReason")}</Label>
          <Textarea id="ses-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby="ses-reason-hint" />
          <p id="ses-reason-hint" className="text-xs text-muted-foreground">{t("sesReasonHint")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ses-scope">{t("sesScope")}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "read" | "write")}>
              <SelectTrigger id="ses-scope"><SelectValue>{t(scope === "read" ? "sesScopeRead" : "sesScopeWrite")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="read">{t("sesScopeRead")}</SelectItem>
                <SelectItem value="write">{t("sesScopeWrite")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ses-minutes">{t("sesDuration")}</Label>
            <Select value={String(minutes)} onValueChange={(v) => setMinutes(Number(v))}>
              <SelectTrigger id="ses-minutes"><SelectValue>{duration(minutes)}</SelectValue></SelectTrigger>
              <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{duration(d)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {scope === "write" && <p role="status" className="rounded-2xl bg-warning-soft p-3 text-sm text-warning-foreground">{t("sesWriteNote")}</p>}
      </div>
    </DataTableEntityFormSheet>
  )
}
