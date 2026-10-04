import { describe, expect, it } from "vitest"
import { writeFileSync } from "fs"
import { buildXlsx } from "./xlsx"

describe("buildXlsx", () => {
  it("produces a zip with the workbook parts and neutralizes formulas", () => {
    const bytes = buildXlsx({ name: "Report", columns: [{ label: "Name" }, { label: "Amount" }], rows: [["=HYPERLINK(\"x\")", 12.5], ["Ali & Co <b>", -3]] })
    expect(bytes[0]).toBe(0x50) // "PK"
    expect(bytes[1]).toBe(0x4b)
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain("xl/worksheets/sheet1.xml")
    expect(text).toContain("'=HYPERLINK")
    expect(text).toContain("Ali &amp; Co &lt;b&gt;")
    expect(text).toContain("<v>-3</v>")
    if (process.env.XLSX_OUT) writeFileSync(process.env.XLSX_OUT, bytes)
  })
})
