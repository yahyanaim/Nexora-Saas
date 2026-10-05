"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClients } from "@/hooks/workforce/use-workforce"
import { ClientStatus } from "@/types/workforce"
import { PortalView } from "./portal-view"
import { PortalAccessManager } from "./portal-access-manager"

/**
 * /dashboard/portal. A client contact sees its own portal; company staff
 * manage who has access and can preview any client's portal.
 */
export default function PortalPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const me = authedUser as { clientId?: string; name?: string } | undefined
  const { data: clients = [] } = useClients()
  const [previewing, setPreviewing] = useState<string | null>(null)

  if (me?.clientId) {
    const client = clients.find((c) => c.id === me.clientId)
    return (
      <div className="p-4 md:p-6 space-y-6">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel md:p-6">
          <p className="text-sm text-muted-foreground">{client?.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">{t("portalWelcome", { name: (me.name ?? "").split(" ")[0] ?? "" })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("portalWelcomeSub")}</p>
        </section>
        <PortalView clientId={me.clientId} viewerName={me.name ?? ""} />
      </div>
    )
  }

  const active = clients.filter((c) => c.status !== ClientStatus.ARCHIVED)
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          previewing ? (
            <div className="flex items-center gap-2">
              <Select value={previewing} onValueChange={setPreviewing}>
                <SelectTrigger className="w-52 bg-card" aria-label={t("client")}>
                  <SelectValue>{clients.find((c) => c.id === previewing)?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>{active.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setPreviewing(null)}>
                <ArrowLeft className="size-4" /> {t("portalBackToAccess")}
              </Button>
            </div>
          ) : undefined
        }
      />
      {previewing ? (
        <>
          <p className="rounded-2xl bg-info-soft p-3 text-sm text-info-foreground">{t("portalPreviewBanner")}</p>
          <PortalView clientId={previewing} viewerName={authedUser?.name ?? ""} preview />
        </>
      ) : (
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-1 text-base font-semibold">{t("portalAccessTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("portalAccessHint")}</p>
          <PortalAccessManager onPreview={setPreviewing} />
        </section>
      )}
    </div>
  )
}
