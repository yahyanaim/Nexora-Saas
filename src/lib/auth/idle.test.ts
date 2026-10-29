import { describe, expect, it } from "vitest"
import { idleAction, idleMinutesFor } from "./idle"

describe("idle timeouts (D3, A2.4)", () => {
  it("gives console staff 15 minutes and company users 30", () => {
    expect(idleMinutesFor({ platformOperator: true })).toBe(15)
    expect(idleMinutesFor({})).toBe(30)
    expect(idleMinutesFor(undefined)).toBe(30)
  })

  it("locks with a passcode, signs out without, and does nothing before the limit", () => {
    const start = 1_000_000
    expect(idleAction(start, start + 29 * 60_000, 30, true)).toBe("none")
    expect(idleAction(start, start + 30 * 60_000, 30, true)).toBe("lock")
    expect(idleAction(start, start + 30 * 60_000, 30, false)).toBe("signOut")
  })
})

describe("idle sign-out notice", () => {
  it("lasts two minutes and is cleared at the next sign-in", async () => {
    const { clearIdleNotice, leaveIdleNotice, readIdleNotice } = await import("./idle")
    leaveIdleNotice(30, 1_000_000)
    expect(readIdleNotice(1_000_000 + 60_000)).toBe(30)
    expect(readIdleNotice(1_000_000 + 3 * 60_000)).toBeNull()
    clearIdleNotice()
    expect(readIdleNotice(1_000_000)).toBeNull()
  })
})
