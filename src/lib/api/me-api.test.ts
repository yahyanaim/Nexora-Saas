import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AxiosError } from "axios"
import apiClient from "@/lib/myapi/client"
import { listMyWorkspacesApi } from "./me-api"
import { DEMO_WORKSPACES } from "@/lib/workforce/demo-seed"
import { useWorkspaceStore } from "@/store/workspace-store"

describe("listMyWorkspacesApi", () => {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = demo
  })

  it("reads GET /me/workspaces", async () => {
    const list = [{ id: "ws_x", name: "X", currency: "MAD" }]
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: list })
    expect(await listMyWorkspacesApi()).toEqual(list)
    expect(apiClient.get).toHaveBeenCalledWith("/me/workspaces")
  })

  it("falls back to the demo companies when the backend is unreachable in demo mode", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true"
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
    expect(await listMyWorkspacesApi()).toBe(DEMO_WORKSPACES)
  })

  it("throws a real refusal outside demo mode", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false"
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
    await expect(listMyWorkspacesApi()).rejects.toThrow()
  })
})

describe("workspace store setWorkspaces", () => {
  it("keeps the current company when it is still listed, else opens the first", () => {
    useWorkspaceStore.getState().setCurrency(DEMO_WORKSPACES[1]!.id, "JPY")
    const store = useWorkspaceStore.getState()
    store.setCurrent(DEMO_WORKSPACES[1]!.id)
    store.setWorkspaces(DEMO_WORKSPACES)
    expect(useWorkspaceStore.getState().currentId).toBe(DEMO_WORKSPACES[1]!.id)
    expect(useWorkspaceStore.getState().workspaces[1]!.currency).toBe("JPY")
    store.setWorkspaces([{ id: "ws_only", name: "Only", currency: "EUR" }])
    expect(useWorkspaceStore.getState().currentId).toBe("ws_only")
    store.setWorkspaces([])
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1)
    useWorkspaceStore.setState({ workspaces: DEMO_WORKSPACES, currentId: DEMO_WORKSPACES[0]!.id })
  })
})
