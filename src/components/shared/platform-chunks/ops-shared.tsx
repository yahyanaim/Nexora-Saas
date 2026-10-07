"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Cog, CreditCard, Database, HardDrive, Mail, Server, XCircle, type LucideIcon } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import type { Incident, IncidentSeverity, ServiceId, ServiceState } from "@/types/platform-ops"

export const SERVICE_ICON: Record<ServiceId, LucideIcon> = { api: Server, database: Database, jobs: Cog, storage: HardDrive, email: Mail, payments: CreditCard }

const STATE_STYLE: Record<ServiceState, { cls: string; icon: LucideIcon }> = {
  ok: { cls: "bg-success-soft text-success-foreground", icon: CheckCircle },
  degraded: { cls: "bg-warning-soft text-warning-foreground", icon: AlertTriangle },
  down: { cls: "bg-danger-soft text-destructive", icon: XCircle },
}

/** Status always shows an icon and a word, never colour alone. */
export function ServiceStateBadge({ state }: { state: ServiceState }) {
  const t = useTranslations()
  const { cls, icon: Icon } = STATE_STYLE[state]
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", cls)}>
      <Icon className="size-3.5" aria-hidden />
      {t(`opsSt_${state}`)}
    </Badge>
  )
}

/** A backup or restore test result, with its icon. */
export function ResultBadge({ ok }: { ok: boolean }) {
  const t = useTranslations()
  const { cls, icon: Icon } = STATE_STYLE[ok ? "ok" : "down"]
  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", cls)}>
      <Icon className="size-3.5" aria-hidden />
      {t(ok ? "bkOk" : "bkFailed")}
    </Badge>
  )
}

const SEVERITY_CLASS: Record<IncidentSeverity, string> = {
  sev1: "border-destructive/50 text-destructive",
  sev2: "border-destructive/30 text-destructive",
  sev3: "border-warning/50 text-warning-foreground",
  sev4: "text-muted-foreground",
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const t = useTranslations()
  return <Badge variant="outline" className={SEVERITY_CLASS[severity]}>{t(`incSev_${severity}`)}</Badge>
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  investigating: "bg-danger-soft text-destructive",
  identified: "bg-warning-soft text-warning-foreground",
  monitoring: "bg-info-soft text-info-foreground",
  resolved: "bg-success-soft text-success-foreground",
  scheduled: "bg-info-soft text-info-foreground",
  in_progress: "bg-warning-soft text-warning-foreground",
  completed: "bg-success-soft text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
}

export function IncidentStatusBadge({ status }: { status: Incident["status"] }) {
  const t = useTranslations()
  return <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>{t(`incSt_${status}`)}</Badge>
}

/** "47 min", "3 h 05" or "30 days". */
export function useMinutes() {
  const t = useTranslations()
  return (m: number) => (m < 60 ? t("sesMinutes", { n: m }) : m < 48 * 60 ? t("incHoursMinutes", { h: Math.floor(m / 60), m: String(m % 60).padStart(2, "0") }) : t("incDays", { n: Math.floor(m / 1440) }))
}
