"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { FieldGroup } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Download, RotateCcw, Trash2 } from "@/components/ui/carbon/icons"
import { toast } from "@/lib/utils/toast"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { cancelAccountDeletionApi, requestAccountDeletionApi, requestDataExportApi } from "@/lib/api/gdpr-apis"
import { isDemoMode } from "@/lib/auth/demo-mode"
import { translateError } from "@/lib/errors/translate-error"
import { buildPersonalExport } from "@/lib/workforce/personal-data"
import { downloadJson } from "@/lib/utils/download"

const DELETION_KEY = "nexora-account-deletion"

const readScheduled = (userId: string): string | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(DELETION_KEY) ?? "null") as { userId: string; date: string } | null
    return saved?.userId === userId ? saved.date : null
  } catch {
    return null
  }
}

/**
 * The person's own data rights (decision D6, law 09-08): download what Nexora
 * holds about them, or delete their account after a 14-day grace period that
 * they can cancel. Company data stays with the company (Settings → export).
 */
export function PersonalData() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const employee = useCurrentEmployee()
  const { data: entries = [] } = useTimeEntries()
  const { data: leave = [] } = useLeave()
  const { data: expenses = [] } = useExpenses()
  const userId = authedUser?.id ?? ""
  const [scheduledFor, setScheduledFor] = useState<string | null>(() => (typeof window === "undefined" ? null : readScheduled(userId)))
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const request = await requestDataExportApi("json")
      if (request.downloadUrl) window.open(request.downloadUrl, "_blank", "noopener")
      else if (isDemoMode()) {
        downloadJson(buildPersonalExport({ account: { id: userId, name: authedUser?.name, email: authedUser?.email ?? undefined, role: authedUser?.role }, employee, entries, leave, expenses }), "my-nexora-data.json")
      } else {
        toast.success(t("pdExportPreparing"))
        return
      }
      toast.success(t("pdExportReady"))
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setBusy(false)
    }
  }

  const remember = (date: string | null) => {
    setScheduledFor(date)
    try {
      if (date) localStorage.setItem(DELETION_KEY, JSON.stringify({ userId, date }))
      else localStorage.removeItem(DELETION_KEY)
    } catch {
      // the server keeps the real state; this only keeps the notice after a reload
    }
  }

  const requestDeletion = async () => {
    setBusy(true)
    try {
      const request = await requestAccountDeletionApi({})
      remember(request.scheduledFor)
      setConfirming(false)
      toast.success(t("pdDeletionScheduled"))
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setBusy(false)
    }
  }

  const cancelDeletion = async () => {
    setBusy(true)
    try {
      await cancelAccountDeletionApi()
      remember(null)
      toast.success(t("pdDeletionCancelled"))
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setBusy(false)
    }
  }

  const date = scheduledFor ? new Date(scheduledFor).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : ""

  return (
    <>
      <FieldGroup className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="md:text-md bg-background/50 px-2 text-sm text-muted-foreground backdrop-blur-sm">{t("pdTitle")}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("pdHint")}</p>

        {scheduledFor && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <span>{t("pdDeletionOn", { date })}</span>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={cancelDeletion}>
              <RotateCcw className="size-4" />
              {t("pdCancelDeletion")}
            </Button>
          </div>
        )}

        <div className="grid gap-2 pt-1">
          <Button type="button" variant="outline" className="justify-start border-white/10 bg-background/50 hover:bg-background/80" disabled={busy} onClick={download}>
            <Download className="me-2 size-4" />
            {t("pdDownload")}
          </Button>
          {!scheduledFor && (
            <Button type="button" variant="outline" className="justify-start border-white/10 bg-background/50 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => setConfirming(true)}>
              <Trash2 className="me-2 size-4" />
              {t("pdDelete")}
            </Button>
          )}
        </div>
      </FieldGroup>

      <ConfirmAlertDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("pdDelete")}
        description={t("pdDeleteConfirm", { days: 14 })}
        confirmLabel={t("pdDeleteYes")}
        destructive
        isLoading={busy}
        onConfirm={requestDeletion}
      />
    </>
  )
}
