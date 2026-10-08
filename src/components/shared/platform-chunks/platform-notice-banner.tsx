"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CalendarClock, Megaphone, X } from "@/components/ui/carbon/icons"
import { usePlatformNotices } from "@/hooks/platform/use-platform-ops"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useSupportFormat } from "./support-shared"

const KEY = "nexora-dismissed-notices"
const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

/**
 * INC-04, INC-07, CFG-01: incidents, planned maintenance and announcements
 * the Nexora team sent to this company, on every page of its Nexora. Each
 * reader can hide a maintenance notice or an announcement; an incident stays
 * until it is resolved.
 */
export function PlatformNoticeBanner() {
  const t = useTranslations()
  const { dateTime, time } = useSupportFormat()
  const workspace = useCurrentWorkspace()
  const { data: notices = [] } = usePlatformNotices(workspace.id)
  const [dismissed, setDismissed] = useState<string[]>(() => (typeof window === "undefined" ? [] : readDismissed()))
  const visible = notices.filter((n) => n.kind === "incident" || !dismissed.includes(n.id))
  if (visible.length === 0) return null
  const hide = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // private mode: hidden for this visit only
    }
  }
  return (
    <div className="mx-4 mt-4 space-y-2 md:mx-6 md:mt-6">
      {visible.map((n) => (
        <div
          key={n.id}
          role="status"
          className={cn(
            "flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-2 text-sm",
            n.kind === "incident" ? "border-destructive/30 bg-danger-soft text-destructive" : n.kind === "maintenance" ? "border-info-foreground/30 bg-info-soft text-info-foreground" : "border-border bg-card text-foreground",
          )}
        >
          {n.kind === "incident" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> : n.kind === "maintenance" ? <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />}
          <p className="min-w-0 flex-1">
            <span className="font-medium">{n.kind === "incident" ? t("pnIncident", { title: n.title }) : n.kind === "maintenance" ? t("pnMaintenance", { start: dateTime(n.plannedStart), end: time(n.plannedEnd) }) : `${n.title}.`}</span>{" "}
            {n.text}
          </p>
          {n.kind !== "incident" && (
            <Button size="icon" variant="ghost" className="size-7" onClick={() => hide(n.id)} aria-label={t("pnHide")}><X className="size-4" /></Button>
          )}
        </div>
      ))}
    </div>
  )
}
