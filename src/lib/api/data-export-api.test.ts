import { describe, it, expect, beforeEach } from "vitest"
import { deleteWorkspaceDataApi, exportWorkspaceDataApi } from "./data-export-api"

beforeEach(() => localStorage.clear())

describe("workspace data export", () => {
  it("exports and deletes only the chosen workspace's collections", async () => {
    localStorage.setItem("nexora:clients:ws_a", JSON.stringify([{ id: "c1" }]))
    localStorage.setItem("nexora:time-entries:ws_a", JSON.stringify([{ id: "t1" }]))
    localStorage.setItem("nexora:clients:ws_b", JSON.stringify([{ id: "c2" }]))
    localStorage.setItem("theme", "dark")
    const out = (await exportWorkspaceDataApi("ws_a")) as { data: Record<string, unknown> }
    expect(Object.keys(out.data).sort()).toEqual(["clients", "time-entries"])
    expect(await deleteWorkspaceDataApi("ws_a")).toBe(2)
    expect(localStorage.getItem("nexora:clients:ws_b")).not.toBeNull()
    expect(localStorage.getItem("theme")).toBe("dark")
  })
})
