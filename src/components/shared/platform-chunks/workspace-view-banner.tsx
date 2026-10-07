"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Eye, Headset } from "@/components/ui/carbon/icons"
import { Link, usePathname } from "@/i18n/navigation"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useActiveSupportSession, useSupportDeskMutations } from "@/hooks/platform/use-platform-support"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useSupportFormat } from "./support-shared"

/**
 * Shown to the Nexora team while it looks at a customer's workspace in the
 * ERP, so it is always clear whose data this is and how to get back. During
 * an approved support session it also shows the time left and records each
 * page opened in both audit trails (SUP-07).
 */
export function WorkspaceViewBanner() {
  const t = useTranslations()
  const { time } = useSupportFormat()
  const workspace = useCurrentWorkspace()
  const pathname = usePathname()
  const actor = useConsoleActor()
  const { data: active } = useActiveSupportSession(workspace.id)
  const session = active && actor && active.agentId === actor.id ? active : null
  const { recordPage } = useSupportDeskMutations()
  const record = recordPage.mutate
  const last = useRef("")

  useEffect(() => {
    if (!session) return
    const key = `${session.id}:${pathname}`
    if (last.current === key) return
    last.current = key
    record({ sessionId: session.id, path: pathname })
  }, [session, pathname, record])

  return (
    <div role="status" className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning-foreground md:mx-6 md:mt-6">
      {session ? <Headset className="size-4 shrink-0" aria-hidden /> : <Eye className="size-4 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">
        {t("wvbViewing", { name: workspace.name })}
        {session && <span className="block text-xs">{t("wvbSession", { scope: t(session.scope === "read" ? "sesScopeRead" : "sesScopeWrite").toLowerCase(), time: time(session.endsAt) })}</span>}
      </span>
      <Button size="sm" variant="outline" asChild className="bg-card">
        <Link href={session ? "/dashboard/support-access" : "/dashboard/platform"}><ArrowLeft className="size-4 rtl:rotate-180" />{t("wvbBack")}</Link>
      </Button>
    </div>
  )
}
