import { describe, expect, it } from "vitest"
import { compareValues, pageOf, sortRows } from "./table-sort"

describe("table sorting and paging (UX-05)", () => {
  const rows = [
    { name: "Fès Audit", mrr: 490, since: "2025-02-15" },
    { name: "atlas consulting", mrr: 1490, since: "2025-03-01" },
    { name: "Dar Al Bina", mrr: 3325, since: undefined },
    { name: "Atlas Digital", mrr: 1490, since: "2024-11-04" },
  ]

  it("sorts text without case or accent surprises, numbers as numbers, and keeps ties in order", () => {
    expect(sortRows(rows, (r) => r.name, "asc").map((r) => r.name)).toEqual(["atlas consulting", "Atlas Digital", "Dar Al Bina", "Fès Audit"])
    expect(sortRows(rows, (r) => r.mrr, "desc").map((r) => r.name)).toEqual(["Dar Al Bina", "atlas consulting", "Atlas Digital", "Fès Audit"])
    expect(compareValues("Item 2", "Item 10", "asc")).toBeLessThan(0)
  })

  it("puts empty values last in both directions", () => {
    expect(sortRows(rows, (r) => r.since, "asc").at(-1)!.name).toBe("Dar Al Bina")
    expect(sortRows(rows, (r) => r.since, "desc").at(-1)!.name).toBe("Dar Al Bina")
  })

  it("pages and keeps the page inside the range", () => {
    const list = Array.from({ length: 37 }, (_, i) => i + 1)
    expect(pageOf(list, 1, 10)).toMatchObject({ rows: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], from: 11, to: 20, total: 37, pageCount: 4 })
    expect(pageOf(list, 9, 10)).toMatchObject({ pageIndex: 3, from: 31, to: 37 })
    expect(pageOf([], 0, 10)).toMatchObject({ rows: [], from: 0, to: 0, pageCount: 1 })
  })
})
