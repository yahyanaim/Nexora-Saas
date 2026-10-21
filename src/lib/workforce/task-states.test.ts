import { describe, expect, it } from "vitest"
import { DEFAULT_TASK_STATES, cleanTaskStates, projectStates, stateOf, stateText, validateTaskStates } from "./task-states"
import { groupTasks, NO_VALUE } from "./task-grouping"
import { isTaskOverdue, milestoneState, MilestoneState, taskProgress } from "./project-metrics"
import { rescheduled } from "@/components/shared/work-projects-chunks/task-calendar"
import { Priority, TaskStatus, type Milestone, type TaskState, type WorkTask } from "@/types/work-projects"

const task = (id: string, over: Partial<WorkTask> = {}): WorkTask =>
  ({ id, workspaceId: "ws", projectId: "p1", title: id, status: TaskStatus.TODO, priority: Priority.MEDIUM, estimatedHours: 1, subtasks: [], order: 0, createdAt: "", updatedAt: "", ...over }) as WorkTask
const waiting: TaskState = { id: "st_wait", name: "Waiting for client", group: TaskStatus.IN_PROGRESS }
const states = projectStates({ taskStates: [...DEFAULT_TASK_STATES, waiting] })

describe("project statuses (P2)", () => {
  it("orders statuses by group, keeping the project's order inside a group", () => {
    expect(projectStates(undefined).map((s) => s.id)).toEqual(["todo", "in_progress", "review", "done", "cancelled"])
    expect(states.map((s) => s.id)).toEqual(["todo", "in_progress", "st_wait", "review", "done", "cancelled"])
  })

  it("finds a task's status and falls back to the group's first one", () => {
    expect(stateOf(task("a", { status: TaskStatus.IN_PROGRESS, stateId: "st_wait" }), states).id).toBe("st_wait")
    // a removed status, or one of another group, falls back
    expect(stateOf(task("b", { status: TaskStatus.IN_PROGRESS, stateId: "gone" }), states).id).toBe("in_progress")
    expect(stateOf(task("c", { status: TaskStatus.DONE, stateId: "st_wait" }), states).id).toBe("done")
    expect(stateText(waiting)).toBe("Waiting for client")
    expect(stateText(DEFAULT_TASK_STATES[0]!)).toBe("todo")
  })

  it("keeps a status in each group, short unique names and at most 20", () => {
    expect(() => validateTaskStates(DEFAULT_TASK_STATES.filter((s) => s.group !== TaskStatus.REVIEW))).toThrow(/at least one/)
    expect(() => validateTaskStates([...DEFAULT_TASK_STATES, { id: "x", name: "to DO ", group: TaskStatus.TODO }, { id: "y", name: "To do", group: TaskStatus.REVIEW }])).toThrow(/same name/)
    expect(() => validateTaskStates([...DEFAULT_TASK_STATES, { id: "x", name: "x".repeat(41), group: TaskStatus.TODO }])).toThrow(/40/)
    expect(() => validateTaskStates([...DEFAULT_TASK_STATES, ...Array.from({ length: 16 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, group: TaskStatus.TODO }))])).toThrow(/20/)
    expect(() => validateTaskStates(states)).not.toThrow()
    expect(cleanTaskStates([{ id: "todo", name: "  ", group: TaskStatus.TODO }, { id: "x", name: " Blocked ", group: TaskStatus.IN_PROGRESS }])).toEqual([{ id: "todo", group: TaskStatus.TODO }, { id: "x", name: "Blocked", group: TaskStatus.IN_PROGRESS }])
  })

  it("treats cancelled tasks as closed and leaves them out of progress", () => {
    const list = [task("a", { status: TaskStatus.DONE, estimatedHours: 4 }), task("b", { status: TaskStatus.CANCELLED, estimatedHours: 40, dueDate: "2020-01-01" }), task("c", { estimatedHours: 4 })]
    expect(taskProgress(list)).toBe(50)
    expect(isTaskOverdue(list[1]!, "2026-01-01")).toBe(false)
    const ms = { id: "m", dueDate: "2030-01-01", requiresApproval: false } as Milestone
    expect(milestoneState(ms, [task("d", { milestoneId: "m", status: TaskStatus.DONE }), task("e", { milestoneId: "m", status: TaskStatus.CANCELLED })])).toBe(MilestoneState.REACHED)
  })
})

describe("spreadsheet groups (P2)", () => {
  const ctx = { states, people: [{ id: "lina" }, { id: "omar" }], milestones: [{ id: "m1" }], labels: [{ id: "bug" }, { id: "ui" }] }
  const list = [
    task("a", { status: TaskStatus.IN_PROGRESS, stateId: "st_wait", assigneeId: "omar", priority: Priority.LOW, labelIds: ["bug", "ui"] }),
    task("b", { assigneeId: "lina", priority: Priority.URGENT, milestoneId: "m1" }),
    task("c", { priority: Priority.LOW }),
  ]

  it("groups in a fixed order with the empty value last", () => {
    expect(groupTasks(list, "status", "none", ctx).map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([["todo", ["b", "c"]], ["st_wait", ["a"]]])
    expect(groupTasks(list, "assignee", "none", ctx).map((g) => g.key)).toEqual(["lina", "omar", NO_VALUE])
    expect(groupTasks(list, "priority", "none", ctx).map((g) => g.key)).toEqual([Priority.URGENT, Priority.LOW])
    expect(groupTasks(list, "milestone", "none", ctx).map((g) => g.key)).toEqual(["m1", NO_VALUE])
  })

  it("puts a task under each of its labels and sub-groups inside groups", () => {
    expect(groupTasks(list, "label", "none", ctx).map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([["bug", ["a"]], ["ui", ["a"]], [NO_VALUE, ["b", "c"]]])
    const nested = groupTasks(list, "priority", "assignee", ctx)
    expect(nested[1]!.sub!.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([["omar", ["a"]], [NO_VALUE, ["c"]]])
    expect(groupTasks(list, "priority", "priority", ctx)[0]!.sub).toBeUndefined()
  })
})

describe("calendar moves (P2)", () => {
  it("moves the start with the due date", () => {
    expect(rescheduled({ startDate: "2026-10-01", dueDate: "2026-10-05" }, "2026-10-12")).toEqual({ dueDate: "2026-10-12", startDate: "2026-10-08" })
    expect(rescheduled({}, "2026-10-12")).toEqual({ dueDate: "2026-10-12" })
    expect(rescheduled({ startDate: "2026-10-20" }, "2026-10-12")).toEqual({ dueDate: "2026-10-12", startDate: "2026-10-12" })
  })
})
