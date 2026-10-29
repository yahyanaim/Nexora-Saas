import { describe, it, expect, beforeEach } from "vitest"
import { deleteWorkspaceDataApi, exportWorkspaceDataApi } from "./data-export-api"
import { listAudit } from "@/lib/workforce/audit"

beforeEach(() => localStorage.clear())

describe("workspace data export", () => {
  it("exports and deletes only the chosen workspace's collections, and keeps the audit trail", async () => {
    listAudit("ws_a") // opens the store (its data-version check) before the test writes to it
    localStorage.setItem("nexora:clients:ws_a", JSON.stringify([{ id: "c1" }]))
    localStorage.setItem("nexora:time-entries:ws_a", JSON.stringify([{ id: "t1" }]))
    localStorage.setItem("nexora:clients:ws_b", JSON.stringify([{ id: "c2" }]))
    localStorage.setItem("theme", "dark")
    const out = (await exportWorkspaceDataApi("ws_a")) as { data: Record<string, unknown> }
    expect(Object.keys(out.data).sort()).toEqual(["audit", "clients", "time-entries"])
    expect(await deleteWorkspaceDataApi("ws_a")).toBe(2)
    expect(localStorage.getItem("nexora:clients:ws_b")).not.toBeNull()
    expect(localStorage.getItem("theme")).toBe("dark")
    expect(listAudit("ws_a").map((e) => e.actionKey)).toEqual(["settings.data_deleted", "settings.data_exported"])
  })
})
