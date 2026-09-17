import type { LucideIcon } from "@/components/ui/carbon/icons"
import { CloudFog, Ghost, Clock } from "@/components/ui/carbon/icons"

export type LastSeenStatus = "visible" | "ghost" | "professional"

export interface LastSeenMeta {
  text: string
  icon: LucideIcon
  color: string
  glow?: boolean
  animate?: boolean
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatVisibleLastSeen(
  date: Date,
  locale: string,
  t: TranslateFn
): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const timeStr = formatTime(date, locale)

  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return t("todayHour", { time: timeStr })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate()) {
    return t("yesterday", { time: timeStr })
  }

  if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: "short",
    }).format(date)
    return `${weekday} ${timeStr}`
  }

  const sameYear = date.getFullYear() === now.getFullYear()
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date)

  return `${dateStr} ${timeStr}`
}

function formatProfessionalLastSeen(date: Date, t: TranslateFn): string {
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 7) return t("recently")
  if (diffDays < 30) return t("lastWeek")
  return t("longTimeAgo")
}

export function getLastSeenMeta(
  lastSeenAt: string | null | undefined,
  status: LastSeenStatus = "visible",
  locale: string = "en",
  t: TranslateFn
): LastSeenMeta {
  if (status === "ghost") {
    return { text: t("ghost"), icon: Ghost, color: "text-zinc-500" }
  }

  if (status === "professional") {
    if (!lastSeenAt) {
      return { text: t("unavailable"), icon: CloudFog, color: "text-zinc-500" }
    }
    const date = new Date(lastSeenAt)
    return {
      text: formatProfessionalLastSeen(date, t),
      icon: Clock,
      color: "text-amber-400",
    }
  }

  if (!lastSeenAt) {
    return { text: t("offline"), icon: CloudFog, color: "text-zinc-500" }
  }

  const date = new Date(lastSeenAt)
  return {
    text: formatVisibleLastSeen(date, locale, t),
    icon: Clock,
    color: "text-cyan-400",
  }
}
