import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { readTableViews } from "@/lib/ui/saved-views"
import { NextIntlClientProvider } from "next-intl"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import messages from "@/messages/en.json"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { inSelection, searchIn, sortHeader } from "./console-table"

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }))
vi.mock("@/lib/utils/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/hooks/auth/use-auth-guard", () => ({ useAuthGuard: () => ({ authedUser: { id: "u_sophia" } }) }))

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
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <DataTable title="Companies" columns={columns} data={rows} searchColumnId="name" searchPlaceholder="Search companies" enableExport={false} showRange {...extra} />
      </NextIntlClientProvider>
    </QueryClientProvider>
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

describe("saved views (A11 step 5)", () => {
  beforeEach(() => localStorage.clear())
  const search = () => screen.getByRole("textbox", { name: "Search companies" }) as HTMLInputElement
  const openViews = () => {
    const trigger = screen.getByRole("button", { name: /^Views/ })
    act(() => {
      fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })
      fireEvent.click(trigger)
    })
  }

  it("save the search, sort and rows per page under a name, and bring them back in one click", async () => {
    renderTable({ savedViewsKey: "console-customers", defaultSorting: [{ id: "mrr", desc: true }] })
    fireEvent.change(search(), { target: { value: "rabat" } })
    expect(desktopRows()).toHaveLength(6)

    openViews()
    fireEvent.click(await screen.findByText("Save the current view…"))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Rabat" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    const saved = readTableViews("console-customers", "u_sophia")
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ name: "Rabat", sorting: [{ id: "mrr", desc: true }], columnFilters: [{ id: "name", value: "rabat" }], pageSize: 10 })
    // the menu names the view the list shows
    expect(screen.getByRole("button", { name: "Views: Rabat" })).toBeInTheDocument()

    fireEvent.change(search(), { target: { value: "" } })
    expect(desktopRows()).toHaveLength(10)
    openViews()
    fireEvent.click(await screen.findByText("Rabat"))
    expect(search().value).toBe("rabat")
    expect(desktopRows()).toHaveLength(6)

    openViews()
    fireEvent.click(await screen.findByRole("button", { name: "Delete the view Rabat" }))
    expect(readTableViews("console-customers", "u_sophia")).toEqual([])
  })

  it("are not offered on lists that do not ask for them", () => {
    renderTable()
    expect(screen.queryByRole("button", { name: /^Views/ })).not.toBeInTheDocument()
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

describe("grouped rows (CRM step 10)", () => {
  it("shows every row under group headings that fold, without pages", () => {
    renderTable({ groupBy: { key: (r) => (r.mrr >= 600 ? "big" : ""), label: (k) => (k ? "Big" : "Small") } })
    expect(screen.queryByText("1–10 of 13")).not.toBeInTheDocument()
    const table = screen.getAllByRole("table")[0]!
    const big = within(table).getByRole("button", { name: /^Big/ })
    const before = within(table).getAllByRole("row").length
    expect(big).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(big)
    expect(big).toHaveAttribute("aria-expanded", "false")
    expect(within(table).getAllByRole("row").length).toBeLessThan(before)
    // the empty group comes last
    const headings = within(table).getAllByRole("button", { name: /^(Big|Small)/ }).map((b) => b.textContent)
    expect(headings[headings.length - 1]).toMatch(/^Small/)
  })
})
