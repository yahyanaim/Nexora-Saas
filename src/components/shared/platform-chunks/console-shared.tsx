"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShieldCheck } from "@/components/ui/carbon/icons"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { isValidStepUpCode } from "@/lib/platform/session-policy"
import { cn } from "@/lib/utils"
import { ConsoleRole, type ConsoleAuditAction } from "@/types/platform-console"

/** Audit trail action names, shared by the audit page and each customer's history. */
export const ACTION_LABEL: Record<ConsoleAuditAction, string> = {
  "staff.invited": "auaInvited",
  "staff.invite_resent": "auaInviteResent",
  "staff.role_changed": "auaRoleChanged",
  "staff.removed": "auaRemoved",
  "session.revoked": "auaSessionRevoked",
  "audit.exported": "auaExported",
  "customer.trial_created": "auaTrialCreated",
  "customer.status_changed": "auaStatusChanged",
  "customer.trial_extended": "auaTrialExtended",
  "customer.suspended": "auaCustomerSuspended",
  "customer.suspension_lifted": "auaCustomerLifted",
  "customer.cancelled": "auaCustomerCancelled",
  "customer.cancellation_undone": "auaCancelUndone",
  "customer.reactivated": "auaReactivated",
  "customer.note_added": "auaNoteAdded",
  "user.password_reset": "auaPasswordReset",
  "user.suspended": "auaUserSuspended",
  "user.suspension_lifted": "auaUserLifted",
  "subscription.started": "auaSubStarted",
  "support.request_created": "auaSupCreated",
  "support.replied": "auaSupReplied",
  "support.assigned": "auaSupAssigned",
  "support.status_changed": "auaSupStatus",
  "support.session_requested": "auaSesRequested",
  "support.session_approved": "auaSesApproved",
  "support.session_refused": "auaSesRefused",
  "support.session_ended": "auaSesEnded",
  "support.page_viewed": "auaSesPage",
  "plan.version_created": "auaPriceChanged",
  "billing.jobs_run": "auaJobsRun",
  "payment.recorded": "auaPaymentRecorded",
  "payment.matched": "auaPaymentMatched",
  "refund.approved": "auaRefundApproved",
  "subscription.changed": "auaSubscriptionChanged",
  "invoice.credit_note": "auaCreditNote",
  "payment.refund": "auaRefund",
  "console.signed_in": "auaSignedIn",
}

export const ROLE_LABEL: Record<ConsoleRole, string> = {
  [ConsoleRole.OWNER]: "crOwner",
  [ConsoleRole.ADMIN]: "crAdmin",
  [ConsoleRole.SUPPORT]: "crSupport",
  [ConsoleRole.FINANCE]: "crFinance",
  [ConsoleRole.ENGINEERING]: "crEngineering",
  [ConsoleRole.SALES]: "crSales",
  [ConsoleRole.READ_ONLY]: "crReadOnly",
}

const ROLE_CLASS: Record<ConsoleRole, string> = {
  [ConsoleRole.OWNER]: "bg-primary/10 text-primary",
  [ConsoleRole.ADMIN]: "bg-info-soft text-info-foreground",
  [ConsoleRole.SUPPORT]: "bg-success-soft text-success-foreground",
  [ConsoleRole.FINANCE]: "bg-warning-soft text-warning-foreground",
  [ConsoleRole.ENGINEERING]: "bg-muted text-foreground",
  [ConsoleRole.SALES]: "bg-info-soft text-info-foreground",
  [ConsoleRole.READ_ONLY]: "bg-muted text-muted-foreground",
}

export function RoleBadge({ role }: { role: ConsoleRole | "customer" }) {
  const t = useTranslations()
  if (role === "customer") return <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t("crCustomer")}</Badge>
  return <Badge variant="outline" className={cn("border-transparent", ROLE_CLASS[role])}>{t(ROLE_LABEL[role])}</Badge>
}

/**
 * UX-01: a permanent strip with the signed-in team member, their console role
 * and the environment, on every console page.
 */
export function ConsoleStrip() {
  const t = useTranslations()
  const actor = useConsoleActor()
  if (!actor) return null
  return (
    <div role="status" className="mx-4 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-4 py-2 text-sm md:mx-6 md:mt-6">
      <ShieldCheck className="size-4 text-primary" aria-hidden />
      <span className="font-medium">{actor.name}</span>
      <RoleBadge role={actor.role} />
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{t("csEnvironment")}</span>
      <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("csDemo")}</Badge>
    </div>
  )
}

/**
 * SEC-04: sensitive actions ask for a fresh code from the authenticator app.
 * The demo accepts any six digits; the server checks the real code.
 */
export function StepUpDialog({
  open,
  onOpenChange,
  action,
  onConfirmed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What will happen, shown above the code field (UX-02) */
  action: string
  onConfirmed: () => void
}) {
  const t = useTranslations()
  const [code, setCode] = useState("")
  const [error, setError] = useState(false)
  const close = (v: boolean) => {
    if (!v) {
      setCode("")
      setError(false)
    }
    onOpenChange(v)
  }
  const submit = () => {
    if (!isValidStepUpCode(code)) {
      setError(true)
      return
    }
    close(false)
    onConfirmed()
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("suTitle")}</DialogTitle>
          <DialogDescription>{action}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-2"
        >
          <Label htmlFor="step-up-code">{t("suCode")}</Label>
          <Input
            id="step-up-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""))
              setError(false)
            }}
            aria-invalid={error}
            aria-describedby="step-up-hint"
            className="tracking-[0.4em] tabular-nums"
          />
          <p id="step-up-hint" className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error ? t("suInvalid") : t("suHint")}</p>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>{t("cancel")}</Button>
            <Button type="submit">{t("suConfirm")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
