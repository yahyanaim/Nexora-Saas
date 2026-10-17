import { describe, expect, it } from "vitest"
import { pageWindow } from "@/components/shared/data-table-chunks/data-table-pagination"
import { relativeDay } from "./clients-columns"

describe("numbered pager", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(0, 4)).toEqual([0, 1, 2, 3])
  })
  it("keeps the first, the last and the pages around the current one, with gaps", () => {
    expect(pageWindow(0, 20)).toEqual([0, 1, 2, 3, null, 19])
    expect(pageWindow(10, 20)).toEqual([0, null, 9, 10, 11, null, 19])
    expect(pageWindow(19, 20)).toEqual([0, null, 16, 17, 18, 19])
  })
})

describe("last contact in words", () => {
  it("reads as days, weeks, months or years, in the reader's language", () => {
    expect(relativeDay("2026-10-16", "2026-10-16", "en")).toBe("today")
    expect(relativeDay("2026-10-13", "2026-10-16", "en")).toBe("3 days ago")
    expect(relativeDay("2026-10-18", "2026-10-16", "en")).toBe("in 2 days")
    expect(relativeDay("2026-09-25", "2026-10-16", "en")).toBe("3 weeks ago")
    expect(relativeDay("2026-06-16", "2026-10-16", "en")).toBe("4 months ago")
    expect(relativeDay("2026-10-15", "2026-10-16", "fr")).toBe("hier")
  })
})
