import { beforeEach, describe, expect, it } from "vitest"
import { buildInbox } from "./inbox"
import { addTaskCommentApi, listMentionsForApi } from "@/lib/api/task-collab-api"
import type { TaskComment, WorkTask } from "@/types/work-projects"

describe("@mentions in task comments reach the bell (G-04)", () => {
  beforeEach(() => localStorage.clear())

  it("finds the comments that mention a person since a date", async () => {
    await addTaskCommentApi("ws_atlas", "tsk_1", "Can you review, @Karim Haddad?", [{ id: "emp_karim", name: "Karim Haddad" }])
    await addTaskCommentApi("ws_atlas", "tsk_1", "No one named", [{ id: "emp_karim", name: "Karim Haddad" }])
    const today = new Date().toISOString().slice(0, 10)
    expect((await listMentionsForApi("ws_atlas", "emp_karim", today)).map((c) => c.body)).toEqual(["Can you review, @Karim Haddad?"])
    expect(await listMentionsForApi("ws_atlas", "emp_lina", today)).toEqual([])
  })

  it("rings once per recent comment, never for your own or a deleted task", () => {
    const base = { rights: { approveTime: false, invoices: false, hr: false }, employees: [{ id: "karim", name: "Karim Haddad" }, { id: "lina", name: "Lina Moreau" }] as never[], reviews: [], entries: [], leave: [], expenses: [], invoices: [], documents: [], today: "2026-10-28" }
    const tasks = [{ id: "t1", projectId: "p1", title: "Login page" }, { id: "t2", projectId: "p1", title: "Gone", deletedAt: "2026-10-20" }] as WorkTask[]
    const comment = (id: string, o: Partial<TaskComment> = {}): TaskComment => ({ id, workspaceId: "w", taskId: "t1", authorName: "Lina Moreau", body: "hi", mentionIds: ["karim"], createdAt: "2026-10-27T10:00:00Z", updatedAt: "", ...o })
    const taskMentions = [comment("new"), comment("old", { createdAt: "2026-10-01T10:00:00Z" }), comment("mine", { authorName: "Karim Haddad" }), comment("gone", { taskId: "t2" })]
    const items = buildInbox({ ...base, viewer: { employeeId: "karim", isAdmin: false }, tasks, taskMentions })
    expect(items.map((i) => i.id)).toEqual(["task-mention:new"])
    expect(items[0]).toMatchObject({ title: "inboxTaskMention", values: { name: "Lina Moreau", task: "Login page" }, href: "/dashboard/projects/p1?task=t1" })
  })
})
