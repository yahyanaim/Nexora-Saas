import { describe, expect, it } from "vitest"
import { formatInZone, sameClock, zoneForCountry } from "./time-zone"

describe("time zones (UX-09)", () => {
  it("shows a moment in the zone asked, with its short name", () => {
    const iso = "2026-10-13T15:05:00Z"
    expect(formatInZone(iso, "en", "Europe/Paris", { hour: "2-digit", minute: "2-digit", hour12: false })).toMatch(/^17:05 GMT\+2$/)
    expect(formatInZone(iso, "en", "America/Chicago", { hour: "2-digit", minute: "2-digit", hour12: false })).toMatch(/^10:05 CDT$/)
  })
  it("knows each customer country's zone and when two clocks differ", () => {
    expect(zoneForCountry("US")).toBe("America/Chicago")
    expect(zoneForCountry(undefined)).toBe("Africa/Casablanca")
    expect(sameClock("2026-10-13T15:05:00Z", "Europe/Paris", "Europe/Madrid")).toBe(true)
    expect(sameClock("2026-10-13T15:05:00Z", "Europe/Paris", "America/Chicago")).toBe(false)
  })
})
