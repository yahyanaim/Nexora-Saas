import { beforeEach, describe, expect, it } from "vitest"
import { listAudit } from "./audit"
import { deleteWorkspaceDataApi, exportWorkspaceDataApi } from "@/lib/api/data-export-api"
import { addClientFileApi, removeClientFileApi } from "@/lib/api/client-files-api"
import { deleteTaskApi, listProjectsApi, listTasksApi, purgeTaskApi, restoreTaskApi } from "@/lib/api/work-projects-api"
import { deleteTemplateApi, saveProjectAsTemplateApi } from "@/lib/api/project-templates-api"
import { auditActionLabel } from "@/components/shared/audit-logs-chunks/audit-logs-columns"
import en from "@/messages/en.json"

const WS = "ws_atlas"
const lastKey = () => listAudit(WS)[0]?.actionKey

describe("audit entries (A2.2)", () => {
  beforeEach(() => localStorage.clear())

  it("writes export and delete-all, and the trail survives a delete-all", async () => {
    await exportWorkspaceDataApi(WS)
    expect(lastKey()).toBe("settings.data_exported")
    await listProjectsApi(WS) // seeds a collection
    expect(await deleteWorkspaceDataApi(WS)).toBeGreaterThan(0)
    const keys = listAudit(WS).map((e) => e.actionKey)
    expect(keys.slice(0, 2)).toEqual(["settings.data_deleted", "settings.data_exported"])
  })

  it("writes client files added and removed", async () => {
    const file = await addClientFileApi(WS, "cli_medica", { name: "brief.pdf", type: "application/pdf", size: 10, dataUrl: "data:application/pdf;base64,AAAA" }, "other" as never)
    expect(listAudit(WS)[0]).toMatchObject({ actionKey: "client.file_added", targetResource: "brief.pdf" })
    await removeClientFileApi(WS, file.id)
    expect(lastKey()).toBe("client.file_removed")
  })

  it("writes task delete, restore and purge", async () => {
    const task = (await listTasksApi(WS))[0]!
    await deleteTaskApi(WS, task.id)
    expect(lastKey()).toBe("task.deleted")
    await restoreTaskApi(WS, task.id)
    expect(lastKey()).toBe("task.restored")
    await deleteTaskApi(WS, task.id)
    await purgeTaskApi(WS, task.id)
    expect(listAudit(WS)[0]).toMatchObject({ actionKey: "task.purged", targetResource: task.title })
  })

  it("writes templates saved and deleted, with labels in the reader's language", async () => {
    const project = (await listProjectsApi(WS))[0]!
    const tpl = await saveProjectAsTemplateApi(WS, project.id, "A2 template")
    expect(lastKey()).toBe("template.saved")
    await deleteTemplateApi(WS, tpl.id)
    const entry = listAudit(WS)[0]!
    expect(entry.actionKey).toBe("template.deleted")
    const messages = en as Record<string, string>
    const t = Object.assign((k: string) => messages[k] ?? k, { has: (k: string) => k in messages })
    expect(auditActionLabel(entry, t)).toBe("Project template deleted")
    expect(auditActionLabel({ action: "Something old", actionKey: "old.thing" }, t)).toBe("Something old")
  })
})
