"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Eye } from "@/components/ui/carbon/icons"
import { Link } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"

/**
 * Shown to the Nexora team while it looks at a customer's workspace in the
 * ERP, so it is always clear whose data this is and how to get back.
 */
export function WorkspaceViewBanner() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  return (
    <div role="status" className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning-foreground md:mx-6 md:mt-6">
      <Eye className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{t("wvbViewing", { name: workspace.name })}</span>
      <Button size="sm" variant="outline" asChild className="bg-card">
        <Link href="/dashboard/platform"><ArrowLeft className="size-4 rtl:rotate-180" />{t("wvbBack")}</Link>
      </Button>
    </div>
  )
}
