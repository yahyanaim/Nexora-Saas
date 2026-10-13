import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ColumnDef } from "@tanstack/react-table"
import messages from "@/messages/en.json"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { inSelection, searchIn, sortHeader } from "./console-table"

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))

type Row = { id: string; name: string; city: string; status: "open" | "waiting_customer" | "closed"; mrr: number }
const rows: Row[] = Array.from({ length: 13 }, (_, i) => ({
  id: `r${i}`,
  name: i === 4 ? "Atlas Consulting" : `Company ${String(i).padStart(2, "0")}`,
  city: i % 2 ? "Rabat" : "Casablanca",
  status: i < 5 ? "open" : i < 9 ? "waiting_customer" : "closed",
  mrr: i * 100,
}))
const columns: ColumnDef<Row>[] = [
  { id: "name", accessorFn: (r) => r.name, header: sortHeader("Company"), filterFn: searchIn<Row>((r) => [r.name, r.city]) },
  { id: "status", accessorFn: (r) => r.status, header: sortHeader("Status"), filterFn: inSelection },
  { id: "mrr", accessorFn: (r) => r.mrr, header: sortHeader("MRR") },
]

function renderTable(extra: Partial<React.ComponentProps<typeof DataTable<Row, unknown>>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DataTable title="Companies" columns={columns} data={rows} searchColumnId="name" searchPlaceholder="Search companies" enableExport={false} showRange {...extra} />
    </NextIntlClientProvider>
  )
}
const desktopRows = () => within(screen.getAllByRole("table")[0]!).getAllByRole("row").slice(1)

describe("console lists on the ERP's rich table", () => {
  it("search looks in every listed field, and the page shows its range", () => {
    renderTable({ defaultSorting: [{ id: "mrr", desc: true }] })
    expect(screen.getByText("1–10 of 13")).toBeInTheDocument()
    expect(desktopRows()[0]).toHaveTextContent("Company 12") // biggest MRR first
    fireEvent.change(screen.getByRole("textbox", { name: "Search companies" }), { target: { value: "atlas" } })
    expect(desktopRows()).toHaveLength(1)
    expect(desktopRows()[0]).toHaveTextContent("Atlas Consulting")
    fireEvent.change(screen.getByRole("textbox", { name: "Search companies" }), { target: { value: "rabat" } })
    expect(desktopRows()).toHaveLength(6)
  })

  it("a default filter keeps only the chosen values (the support desk's active requests)", () => {
    renderTable({ defaultColumnFilters: [{ id: "status", value: ["open", "waiting_customer"] }] })
    expect(screen.getByText("1–9 of 9")).toBeInTheDocument()
    expect(desktopRows().every((r) => !r.textContent?.includes("closed"))).toBe(true)
  })

  it("sortable headers say their order to screen readers", () => {
    renderTable({ defaultSorting: [{ id: "name", desc: false }] })
    const headers = within(screen.getAllByRole("table")[0]!).getAllByRole("columnheader")
    expect(headers[0]).toHaveAttribute("aria-sort", "ascending")
    expect(headers[2]).toHaveAttribute("aria-sort", "none")
    fireEvent.click(screen.getByRole("button", { name: "Sort by MRR" }))
    expect(headers[2]).toHaveAttribute("aria-sort", "ascending")
  })
})

describe("filter helpers", () => {
  const row = (v: string) => ({ getValue: () => v, original: { name: v, city: "Fès" } }) as never
  it("inSelection keeps everything when nothing is ticked", () => {
    expect(inSelection(row("open"), "status", undefined)).toBe(true)
    expect(inSelection(row("open"), "status", [])).toBe(true)
    expect(inSelection(row("open"), "status", ["closed"])).toBe(false)
    expect(inSelection(row("open"), "status", ["closed", "open"])).toBe(true)
  })
  it("searchIn ignores case and empty text", () => {
    const f = searchIn<{ name: string; city: string }>((r) => [r.name, r.city])
    expect(f(row("Atlas"), "name", "  ", () => {})).toBe(true)
    expect(f(row("Atlas"), "name", "FÈS", () => {})).toBe(true)
    expect(f(row("Atlas"), "name", "tanger", () => {})).toBe(false)
  })
})
