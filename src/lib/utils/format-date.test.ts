import { describe, it, expect } from "vitest"
import {
  formatDate,
  formatDateFacebook,
  formatDateWhatsapp,
  formatDateInstagram,
} from "./format-date"

describe("format-date utilities", () => {
  describe("formatDate", () => {
    it("formats valid ISO date string in English, French, Spanish, Arabic", () => {
      const dateStr = "2026-09-14T12:00:00.000Z"
      expect(formatDate(dateStr, "en")).toContain("Sep")
      expect(formatDate(dateStr, "fr")).toContain("sept.")
      expect(formatDate(dateStr, "es")).toContain("sep")
      expect(formatDate(dateStr, "ar")).toBeDefined()
    })

    it("accepts a Date instance directly", () => {
      const d = new Date(2026, 8, 14, 12, 0)
      expect(formatDate(d, "en")).toContain("Sep 14, 2026")
    })

    it("returns empty string for invalid or missing dates", () => {
      expect(formatDate("")).toBe("")
      expect(formatDate(undefined)).toBe("")
      expect(formatDate("invalid-date-string")).toBe("")
    })
  })

  describe("formatDateFacebook", () => {
    it("handles missing or invalid dates with correct locale fallback", () => {
      expect(formatDateFacebook(undefined, "en")).toBe("Unknown")
      expect(formatDateFacebook(undefined, "ar")).toBe("غير معروف")
      expect(formatDateFacebook("invalid", "en")).toBe("Unknown")
      expect(formatDateFacebook("invalid", "ar")).toBe("غير معروف")
    })

    it("formats recent dates (< 24 hours ago)", () => {
      const recent = new Date(Date.now() - 2 * 3600 * 1000)
      expect(formatDateFacebook(recent, "en")).toContain("ago")
      expect(formatDateFacebook(recent, "ar")).toBeDefined()
    })

    it("formats yesterday dates (diffInDays === 1 and diffInHours >= 24)", () => {
      const yesterday = new Date(Date.now() - 26 * 3600 * 1000)
      const enRes = formatDateFacebook(yesterday, "en")
      expect(enRes).toContain("Yesterday at")

      const arRes = formatDateFacebook(yesterday, "ar")
      expect(arRes).toContain("أمس الساعة")
    })

    it("formats dates in current year (> 1 day ago)", () => {
      const now = new Date()
      // 30 days ago, same year
      const thirtyDaysAgo = new Date(now.getFullYear(), Math.max(0, now.getMonth() - 1), 1, 10, 0)
      if (thirtyDaysAgo.getFullYear() === now.getFullYear()) {
        const enRes = formatDateFacebook(thirtyDaysAgo, "en")
        expect(enRes).toContain("at")

        const arRes = formatDateFacebook(thirtyDaysAgo, "ar")
        expect(arRes).toContain("الساعة")
      }
    })

    it("formats dates from past years", () => {
      const pastYear = new Date(2020, 0, 15, 12, 0)
      const formatted = formatDateFacebook(pastYear, "en")
      expect(formatted).toContain("2020")
    })
  })

  describe("formatDateWhatsapp", () => {
    it("returns empty string for invalid or missing dates", () => {
      expect(formatDateWhatsapp(undefined)).toBe("")
      expect(formatDateWhatsapp("invalid-date")).toBe("")
    })

    it("formats dates from today with time", () => {
      const today = new Date()
      const formatted = formatDateWhatsapp(today, "en")
      expect(formatted).toBeDefined()
    })

    it("formats yesterday with localized yesterday keyword", () => {
      const now = new Date()
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)

      expect(formatDateWhatsapp(yesterday, "ar")).toBe("أمس")
      expect(formatDateWhatsapp(yesterday, "en")).toBe("Yesterday")
    })

    it("formats dates within 7 days with weekday name", () => {
      const now = new Date()
      const fourDaysAgo = new Date()
      fourDaysAgo.setDate(now.getDate() - 4)

      const formatted = formatDateWhatsapp(fourDaysAgo, "en")
      expect(formatted.length).toBeGreaterThan(0)
    })

    it("formats older dates (> 7 days) with full date format", () => {
      const oldDate = new Date(2023, 5, 20)
      const formatted = formatDateWhatsapp(oldDate, "en")
      expect(formatted).toContain("2023")
    })
  })

  describe("formatDateInstagram", () => {
    it("returns empty string for missing or invalid dates", () => {
      expect(formatDateInstagram(undefined)).toBe("")
      expect(formatDateInstagram("invalid-input")).toBe("")
    })

    it("formats seconds ago (< 60s)", () => {
      const justNow = new Date(Date.now() - 15 * 1000)
      expect(formatDateInstagram(justNow, "en")).toBe("now")
      expect(formatDateInstagram(justNow, "ar")).toBe("الآن")
    })

    it("formats minutes ago (< 60m)", () => {
      const minsAgo = new Date(Date.now() - 15 * 60 * 1000)
      expect(formatDateInstagram(minsAgo, "en")).toBe("15m")
      expect(formatDateInstagram(minsAgo, "ar")).toBe("15 د")
    })

    it("formats hours ago (< 24h)", () => {
      const hoursAgo = new Date(Date.now() - 5 * 3600 * 1000)
      expect(formatDateInstagram(hoursAgo, "en")).toBe("5h")
      expect(formatDateInstagram(hoursAgo, "ar")).toBe("5 س")
    })

    it("formats days ago (< 7d)", () => {
      const daysAgo = new Date(Date.now() - 3 * 86400 * 1000)
      expect(formatDateInstagram(daysAgo, "en")).toBe("3d")
      expect(formatDateInstagram(daysAgo, "ar")).toBe("3 ي")
    })

    it("formats weeks ago (< 4w)", () => {
      const weeksAgo = new Date(Date.now() - 14 * 86400 * 1000)
      expect(formatDateInstagram(weeksAgo, "en")).toBe("2w")
      expect(formatDateInstagram(weeksAgo, "ar")).toBe("2 أ")
    })

    it("formats past years with year token", () => {
      const pastYear = new Date(2021, 2, 10)
      expect(formatDateInstagram(pastYear, "en")).toContain("2021")
    })
  })
})
