/**
 * UX-09: dates show in the team member's time zone, with the customer's local
 * time on hover. A customer's zone follows its country; the server will store
 * it on the account.
 */
const COUNTRY_ZONE: Record<string, string> = {
  MA: "Africa/Casablanca", FR: "Europe/Paris", ES: "Europe/Madrid", BE: "Europe/Brussels", GB: "Europe/London", DE: "Europe/Berlin",
  US: "America/Chicago", SN: "Africa/Dakar", CI: "Africa/Abidjan", TN: "Africa/Tunis", DZ: "Africa/Algiers", AE: "Asia/Dubai",
}

export const zoneForCountry = (country?: string) => (country && COUNTRY_ZONE[country]) || "Africa/Casablanca"

/** The viewer's own zone, from the browser. */
export const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

/** A date and time in one zone, with the zone's short name (e.g. "Oct 13, 2026, 4:05 PM GMT+1"). */
export function formatInZone(iso: string, locale: string, timeZone: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const main = new Intl.DateTimeFormat(locale, { ...opts, timeZone }).format(d)
  const zone = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value
  return zone ? `${main} ${zone}` : main
}

/** True when two zones show a different clock time at that moment. */
export function sameClock(iso: string, a: string, b: string) {
  const f = (tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", day: "2-digit" }).format(new Date(iso))
  return f(a) === f(b)
}
