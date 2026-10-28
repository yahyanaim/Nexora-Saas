import { beforeEach, describe, expect, it } from "vitest"
import { actionItems, actionTitle, linkActionToTask, pageTemplate, sortPages } from "./project-pages"
import { deleteProjectPageApi, listProjectPagesApi, saveProjectPageApi, setProjectPageBodyApi } from "@/lib/api/project-pages-api"
import type { ProjectPage } from "@/types/work-projects"

const body = "## Notes\nSome text\n\n## Action items\n- [x] Send the brief ORB-01#3\n- [ ] Write the scenarios @Omar Idrissi\n-  [ ]   \n* [ ] Book the room"

describe("project pages (P5)", () => {
  beforeEach(() => localStorage.clear())

  it("reads action items, done or not, with the task key when there is one", () => {
    expect(actionItems(body)).toEqual([
      { line: 4, text: "Send the brief ORB-01#3", done: true, key: "ORB-01#3" },
      { line: 5, text: "Write the scenarios @Omar Idrissi", done: false },
      { line: 7, text: "Book the room", done: false },
    ])
  })

  it("makes a clean task title and links the line to the new task once", () => {
    expect(actionTitle("Write the scenarios @Omar Idrissi", "Omar Idrissi")).toBe("Write the scenarios")
    expect(actionTitle("Send the brief → ORB-01#3")).toBe("Send the brief")
    const linked = linkActionToTask(body, 5, "ORB-01#9")
    expect(linked.split("\n")[5]).toBe("- [ ] Write the scenarios @Omar Idrissi → ORB-01#9")
    expect(linkActionToTask(linked, 5, "ORB-01#10")).toBe(linked)
    expect(linkActionToTask(body, 1, "ORB-01#9")).toBe(body)
  })

  it("puts pinned pages first, then meetings newest first, then pages by title", () => {
    const p = (id: string, o: Partial<ProjectPage>): ProjectPage => ({ id, workspaceId: "w", projectId: "p", kind: "page", title: id, body: "", updatedBy: "", createdAt: "", updatedAt: "", ...o })
    const sorted = sortPages([p("b", {}), p("m1", { kind: "meeting", meetingDate: "2026-01-01" }), p("a", {}), p("m2", { kind: "meeting", meetingDate: "2026-02-01" }), p("z", { pinned: true })])
    expect(sorted.map((x) => x.id)).toEqual(["z", "m2", "m1", "a", "b"])
    expect(pageTemplate("meeting", { agenda: "Agenda", notes: "Notes", actions: "Action items" })).toContain("- [ ] ")
  })

  it("saves, changes and deletes pages with their rules", async () => {
    expect((await listProjectPagesApi("ws_atlas", "prj_orbit")).map((x) => x.title)).toEqual(["Project brief", "Beta planning"])
    await expect(saveProjectPageApi("ws_atlas", { projectId: "prj_orbit", kind: "page", title: " ", body: "" })).rejects.toThrow(/title/)
    await expect(saveProjectPageApi("ws_atlas", { projectId: "prj_orbit", kind: "meeting", title: "Sync", body: "" })).rejects.toThrow(/meeting date/)
    const page = await saveProjectPageApi("ws_atlas", { projectId: "prj_orbit", kind: "meeting", title: "Sync", body: "- [ ] x", meetingDate: "2026-10-28", attendeeIds: ["a", "a"] })
    expect(page.attendeeIds).toEqual(["a"])
    expect((await setProjectPageBodyApi("ws_atlas", page.id, "- [x] x")).body).toBe("- [x] x")
    await expect(setProjectPageBodyApi("ws_atlas", page.id, "x".repeat(20_001))).rejects.toThrow(/20,000/)
    await deleteProjectPageApi("ws_atlas", page.id)
    expect(await listProjectPagesApi("ws_atlas", "prj_orbit")).toHaveLength(2)
  })
})
