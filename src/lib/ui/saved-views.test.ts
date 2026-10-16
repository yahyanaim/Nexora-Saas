import { beforeEach, describe, expect, it } from "vitest"
import { MAX_VIEWS, isCurrentView, readTableViews, removeView, saveView, viewsStorageKey, writeTableViews } from "./saved-views"

const state = { sorting: [{ id: "mrr", desc: true }], columnFilters: [{ id: "status", value: ["payment_overdue"] }, { id: "name", value: "" }], pageSize: 25 }

beforeEach(() => localStorage.clear())

describe("saved views of a list", () => {
  it("are kept per list and per person, and survive a reload", () => {
    const views = saveView([], "Overdue", state, "v1")
    writeTableViews("console-customers", "u1", views)
    expect(readTableViews("console-customers", "u1")).toEqual(views)
    expect(readTableViews("console-customers", "u2")).toEqual([])
    expect(readTableViews("console-invoices", "u1")).toEqual([])
  })

  it("drop empty searches and replace a view saved again under the same name", () => {
    const one = saveView([], "Overdue", state, "v1")
    expect(one[0]!.columnFilters).toEqual([{ id: "status", value: ["payment_overdue"] }])
    const two = saveView(one, "  overdue ", { ...state, pageSize: 50 }, "v2")
    expect(two).toHaveLength(1)
    expect(two[0]).toMatchObject({ id: "v2", name: "overdue", pageSize: 50 })
    expect(saveView(two, "   ", state, "v3")).toBe(two)
  })

  it("keep the newest first, at most 20, and can be removed", () => {
    let views = saveView([], "A", state, "a")
    for (let i = 0; i < MAX_VIEWS + 3; i++) views = saveView(views, `V${i}`, state, `v${i}`)
    expect(views).toHaveLength(MAX_VIEWS)
    expect(views[0]!.name).toBe(`V${MAX_VIEWS + 2}`)
    expect(removeView(views, views[0]!.id)).toHaveLength(MAX_VIEWS - 1)
  })

  it("know which view the list shows, whatever the order of ticked options", () => {
    const view = saveView([], "Two", { ...state, columnFilters: [{ id: "status", value: ["trial", "active"] }] }, "v")[0]!
    expect(isCurrentView(view, { ...state, columnFilters: [{ id: "status", value: ["active", "trial"] }, { id: "name", value: "" }] })).toBe(true)
    expect(isCurrentView(view, { ...state, pageSize: 10, columnFilters: [{ id: "status", value: ["active", "trial"] }] })).toBe(false)
  })

  it("ignore anything in storage that is not a view", () => {
    localStorage.setItem(viewsStorageKey("l", "u"), JSON.stringify([{ id: "x" }, ...saveView([], "Ok", state, "ok"), "junk"]))
    expect(readTableViews("l", "u").map((v) => v.id)).toEqual(["ok"])
    localStorage.setItem(viewsStorageKey("l", "u"), "{not json")
    expect(readTableViews("l", "u")).toEqual([])
  })
})
