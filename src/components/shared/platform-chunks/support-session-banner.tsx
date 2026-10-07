"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Headset, X } from "@/components/ui/carbon/icons"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useActiveSupportSession, useCompanySupportMutations } from "@/hooks/platform/use-platform-support"
import { can } from "@/lib/permissions/can"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import { useSupportFormat } from "./support-shared"

/**
 * SUP-05: while Nexora support can open the workspace, every company user sees
 * it on every page; administrators can end the access at once (SUP-06).
 */
export function SupportSessionBanner() {
  const t = useTranslations()
  const { time } = useSupportFormat()
  const workspace = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const { data: session } = useActiveSupportSession(workspace.id)
  const m = useCompanySupportMutations(workspace.id)
  if (!session) return null
  const isAdmin = can(authedUser, P.ROLES_READ)
  return (
    <div role="status" className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-info-foreground/30 bg-info-soft px-4 py-2 text-sm text-info-foreground md:mx-6 md:mt-6">
      <Headset className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {t("sbActive", { agent: session.agentName, time: time(session.endsAt), scope: t(session.scope === "read" ? "sesScopeRead" : "sesScopeWrite").toLowerCase() })}{" "}
        <Link href="/dashboard/help" className="font-medium underline">{t("sbDetails")}</Link>
      </span>
      {isAdmin && (
        <Button size="sm" variant="outline" className="bg-card" onClick={() => m.revoke.mutate(session.id)} disabled={m.revoke.isPending}>
          <X className="size-4" />{t("helpRevoke")}
        </Button>
      )}
    </div>
  )
}
