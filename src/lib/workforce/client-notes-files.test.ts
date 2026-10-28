import { beforeEach, describe, expect, it } from "vitest"
import { buildInbox } from "./inbox"
import { addClientNoteApi } from "@/lib/api/crm-api"
import { addClientFileApi, listClientFilesApi, removeClientFileApi, setClientFileCategoryApi } from "@/lib/api/client-files-api"
import { deleteClientApi, mergeClientsApi, purgeClientApi } from "@/lib/api/clients-api"
import { ClientNoteKind, type ClientNote } from "@/types/work-crm"
import { ClientStatus, type Client } from "@/types/workforce"

const png = { name: "logo.png", type: "image/png", size: 1200, dataUrl: "data:image/png;base64,iVBORw0KGgo=" }

describe("client notes with @mentions and files (CRM step 10)", () => {
  beforeEach(() => localStorage.clear())

  it("keeps who was mentioned in a note, never the author", async () => {
    const note = await addClientNoteApi("ws_atlas", { clientId: "cli_helio", kind: ClientNoteKind.NOTE, date: "2026-10-28", text: "**Call back** — @Sara Bennani and @Karim, please check. @Emma Rossi", authorId: "emp_emma" })
    expect(note.mentionIds?.sort()).toEqual(["emp_karim", "emp_sara"])
    const plain = await addClientNoteApi("ws_atlas", { clientId: "cli_helio", kind: ClientNoteKind.CALL, date: "2026-10-28", text: "No one named here" })
    expect(plain.mentionIds).toBeUndefined()
    await expect(addClientNoteApi("ws_atlas", { clientId: "cli_helio", kind: ClientNoteKind.NOTE, date: "2026-10-28", text: "x".repeat(5001) })).rejects.toThrow(/5,000/)
  })

  it("rings the bell for a mention in the last 14 days", () => {
    const base = { rights: { approveTime: false, invoices: false, hr: false }, employees: [{ id: "emma", name: "Emma Rossi" }] as never[], reviews: [], entries: [], leave: [], expenses: [], invoices: [], documents: [], tasks: [], today: "2026-10-28" }
    const note = (id: string, date: string, o: Partial<ClientNote> = {}): ClientNote => ({ id, workspaceId: "w", clientId: "c1", kind: ClientNoteKind.NOTE, date, text: "hi", authorId: "emma", mentionIds: ["sara"], createdAt: "", updatedAt: "", ...o })
    const clients = [{ id: "c1", name: "Helio Energy", status: ClientStatus.ACTIVE } as Client]
    const clientNotes = [note("new", "2026-10-27"), note("old", "2026-10-01"), note("other", "2026-10-27", { mentionIds: ["karim"] })]
    const items = buildInbox({ ...base, viewer: { employeeId: "sara", isAdmin: false }, clientNotes, clients })
    expect(items.map((i) => i.id)).toEqual(["mention:new"])
    expect(items[0]).toMatchObject({ title: "inboxMention", values: { name: "Emma Rossi", client: "Helio Energy" }, href: "/dashboard/clients/c1?tab=activity" })
    expect(buildInbox({ ...base, viewer: { employeeId: "emma", isAdmin: false }, clientNotes, clients })).toEqual([])
  })

  it("keeps files per client with size and count limits", async () => {
    const f = await addClientFileApi("ws_atlas", "cli_helio", png, "brief")
    expect((await listClientFilesApi("ws_atlas", "cli_helio")).map((x) => x.name)).toEqual(["logo.png"])
    expect((await setClientFileCategoryApi("ws_atlas", f.id, "contract")).category).toBe("contract")
    await expect(addClientFileApi("ws_atlas", "cli_helio", { ...png, size: 600 * 1024 }, "other")).rejects.toThrow(/500 KB/)
    await expect(addClientFileApi("ws_atlas", "cli_helio", { ...png, dataUrl: "nope" }, "other")).rejects.toThrow(/could not be read/)
    for (let i = 0; i < 19; i++) await addClientFileApi("ws_atlas", "cli_helio", png, "other")
    await expect(addClientFileApi("ws_atlas", "cli_helio", png, "other")).rejects.toThrow(/20 files/)
    await removeClientFileApi("ws_atlas", f.id)
    expect(await listClientFilesApi("ws_atlas", "cli_helio")).toHaveLength(19)
  })

  it("moves files with a merge and removes them with the client", async () => {
    await addClientFileApi("ws_atlas", "cli_medica", png, "proposal")
    await mergeClientsApi("ws_atlas", "cli_helio", "cli_medica")
    expect(await listClientFilesApi("ws_atlas", "cli_helio")).toHaveLength(1)
    await addClientFileApi("ws_atlas", "cli_vela", png, "other")
    await deleteClientApi("ws_atlas", "cli_vela")
    await purgeClientApi("ws_atlas", "cli_vela")
    expect(await listClientFilesApi("ws_atlas", "cli_vela")).toEqual([])
  })
})
