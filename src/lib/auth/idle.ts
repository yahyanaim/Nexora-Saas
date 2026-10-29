/**
 * Idle timeouts (decision D3, audit S-05). The browser locks or signs out on
 * its own; the server applies the same limits to the session (plan Part C).
 */
export const CONSOLE_IDLE_MINUTES = 15
export const COMPANY_IDLE_MINUTES = 30

/** Shared by every tab, so working in one tab keeps the others open. Outside the `nexora:` data keys. */
export const LAST_ACTIVITY_KEY = "nexora-last-activity"

/** Set when the app signs someone out for being idle, so the sign-in page can say why (the page reloads). */
const IDLE_NOTICE_KEY = "nexora-idle-signed-out"

const NOTICE_MS = 2 * 60_000

export function leaveIdleNotice(minutes: number, now = Date.now()) {
  try {
    sessionStorage.setItem(IDLE_NOTICE_KEY, JSON.stringify({ minutes, at: now }))
  } catch {
    // storage blocked: the person just sees the sign-in page
  }
}

/**
 * The idle limit that just signed this tab out, or null. It stays readable for
 * two minutes, because the sign-out can pass through more than one page load.
 */
export function readIdleNotice(now = Date.now()): number | null {
  try {
    const { minutes, at } = JSON.parse(sessionStorage.getItem(IDLE_NOTICE_KEY) ?? "null") ?? {}
    return typeof minutes === "number" && minutes > 0 && now - at < NOTICE_MS ? minutes : null
  } catch {
    return null
  }
}

export function clearIdleNotice() {
  try {
    sessionStorage.removeItem(IDLE_NOTICE_KEY)
  } catch {
    // nothing to clear
  }
}

export const idleMinutesFor = (user: { platformOperator?: boolean } | undefined) => (user?.platformOperator ? CONSOLE_IDLE_MINUTES : COMPANY_IDLE_MINUTES)

/** What happens once the limit is reached: the passcode screen when a passcode is set, else signing out. */
export function idleAction(lastActivity: number, now: number, minutes: number, hasPasscode: boolean): "none" | "lock" | "signOut" {
  if (now - lastActivity < minutes * 60_000) return "none"
  return hasPasscode ? "lock" : "signOut"
}
