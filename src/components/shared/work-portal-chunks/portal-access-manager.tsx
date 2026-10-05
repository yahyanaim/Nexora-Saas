"use client"

import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Eye, Globe, Send, XCircle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { useClients } from "@/hooks/workforce/use-workforce"
import { usePortalAccess, usePortalInactivityDays, usePortalMutations } from "@/hooks/workforce/use-portal"
import { portalStatus } from "@/lib/workforce/portal"
import { ClientStatus } from "@/types/workforce"
import type { PortalDisplayStatus } from "@/types/work-portal"
import { formatShortDate } from "../work-projects-chunks/project-labels"

export const PORTAL_STATUS_CLASS: Record<PortalDisplayStatus | "none", string> = {
  active: "bg-success-soft text-success-foreground border-transparent",
  invited: "bg-info-soft text-info-foreground border-transparent",
  expired: "bg-warning-soft text-warning-foreground border-transparent",
  revoked: "bg-muted text-muted-foreground border-transparent",
  none: "bg-muted/60 text-muted-foreground border-transparent",
}

/** Which client contacts can sign in to the portal (CRM-9, CRM-12). */
export function PortalAccessManager({ onPreview, clientId }: { onPreview?: (clientId: string) => void; clientId?: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: clients = [] } = useClients()
  const { data: access = [] } = usePortalAccess()
  const { data: days } = usePortalInactivityDays()
  const { invite, revoke } = usePortalMutations()
  const now = new Date()
  const shown = clients.filter((c) => c.status !== ClientStatus.ARCHIVED && (!clientId || c.id === clientId))
  const busy = invite.isPending || revoke.isPending

  if (shown.every((c) => c.contacts.length === 0)) return <EmptyState icon={Globe} title={t("portalNoContacts")} />

  return (
    <div className="flex flex-col gap-4">
      {shown.filter((c) => c.contacts.length > 0).map((client) => (
        <div key={client.id} className="rounded-2xl border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">{client.name}</p>
            {onPreview && (
              <Button variant="ghost" size="sm" onClick={() => onPreview(client.id)}>
                <Eye className="size-4" /> {t("portalPreview")}
              </Button>
            )}
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {client.contacts.map((contact) => {
              const row = access.find((a) => a.contactId === contact.id)
              const status: PortalDisplayStatus | "none" = row ? portalStatus(row, now, days) : "none"
              const canInvite = status === "none" || status === "revoked" || status === "expired"
              return (
                <li key={contact.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.email}
                      {row?.lastSeenAt ? ` · ${t("accessLastSignIn", { date: formatShortDate(row.lastSeenAt.slice(0, 10), locale) })}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("w-24 justify-center", PORTAL_STATUS_CLASS[status])}>{t(`portal_${status}`)}</Badge>
                  <div className="flex w-40 justify-end gap-1">
                    {canInvite ? (
                      <Button size="sm" disabled={busy} onClick={() => invite.mutate({ clientId: client.id, contactId: contact.id })}>
                        <Send className="size-4" /> {status === "none" ? t("portalGive") : t("portalReinvite")}
                      </Button>
                    ) : (
                      <>
                        {status === "invited" && (
                          <Button variant="ghost" size="sm" disabled={busy} aria-label={t("accessResend")} onClick={() => invite.mutate({ clientId: client.id, contactId: contact.id })}>
                            <Send className="size-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => row && revoke.mutate(row.id)}>
                          <XCircle className="size-4" /> {t("portalRevoke")}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{t("portalExpiryHint", { days: days ?? 90 })}</p>
    </div>
  )
}
