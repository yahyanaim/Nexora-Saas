"use client"

import { useLocale, useTranslations } from "next-intl"
import { formatInZone, sameClock, viewerZone, zoneForCountry } from "@/lib/ui/time-zone"

/**
 * UX-09: a moment in the team member's own time zone; when the customer lives
 * in another zone, hovering (or focusing) shows the customer's local time.
 */
export function ZonedTime({ iso, country, className }: { iso: string; country?: string; className?: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const mine = viewerZone()
  const theirs = country ? zoneForCountry(country) : undefined
  const other = theirs && !sameClock(iso, mine, theirs) ? t("tzCustomerTime", { time: formatInZone(iso, locale, theirs), zone: theirs }) : undefined
  return (
    <time dateTime={iso} title={other} tabIndex={other ? 0 : undefined} className={className ?? (other ? "cursor-help underline decoration-dotted underline-offset-2" : undefined)}>
      {formatInZone(iso, locale, mine)}
    </time>
  )
}
