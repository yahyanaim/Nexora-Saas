"use client"

import { useTranslations } from "next-intl"
import { Lock } from "@/components/ui/carbon/icons"
import { useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useCurrentWorkspace } from "@/store/workspace-store"

/**
 * What a company's people see when the Nexora team suspended their workspace
 * (CUS-08) or it became read-only: the reason and that data can still be read.
 * The server blocks the changes; this banner explains why.
 */
export function WorkspaceStatusBanner() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  const { data: customers = [] } = useConsoleCustomers()
  const account = customers.find((c) => c.demoWorkspaceId === workspace.id)
  if (!account || (!account.readOnly && account.status !== "suspended")) return null
  return (
    <div role="status" className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-danger-soft px-4 py-3 text-sm text-destructive md:mx-6 md:mt-6">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{account.status === "suspended" ? t("wsbSuspended", { reason: account.suspension?.reason ?? "" }) : t("wsbReadOnly")}</p>
    </div>
  )
}
