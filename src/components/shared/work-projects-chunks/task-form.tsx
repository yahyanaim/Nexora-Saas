"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "@/components/ui/carbon/icons"
import { createId } from "@/lib/workforce/demo-store"
import type { Employee } from "@/types/workforce"
import type { TaskLabel } from "@/types/work-settings"
import { cn } from "@/lib/utils"
import {
  Priority,
  TaskStatus,
  type Milestone,
  type TaskState,
  type WorkTask,
  type WorkTaskInput,
} from "@/types/work-projects"
import { NumberField, SelectField, TextField } from "../workforce-chunks/form-fields"
import { RichTextEditor, type KeyResolver } from "./rich-text"
import { NONE } from "../workforce-chunks/workforce-labels"
import { PRIORITY_LABEL, stateLabel } from "./project-labels"
import { DEFAULT_TASK_STATES, stateOf } from "@/lib/workforce/task-states"

export interface TaskFormHandle {
  submit: () => void
}

const schema = z.object({
  title: z.string().trim().min(2),
  description: z.string().optional(),
  /** The project status (P2); its group becomes the task status */
  stateId: z.string().min(1),
  priority: z.enum(Priority),
  assigneeId: z.string(),
  milestoneId: z.string(),
  startDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  dependsOn: z.array(z.string()),
  estimatedHours: z.number({ error: "required" }).min(0).max(1000),
  subtasks: z.array(z.object({ id: z.string(), title: z.string().trim().min(1), done: z.boolean() })),
  labelIds: z.array(z.string()),
  collaboratorIds: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

function toFormValues(task: Partial<WorkTask> | undefined, states: TaskState[]): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    stateId: stateOf({ status: task?.status ?? TaskStatus.TODO, stateId: task?.stateId }, states).id,
    priority: task?.priority ?? Priority.MEDIUM,
    assigneeId: task?.assigneeId ?? NONE,
    milestoneId: task?.milestoneId ?? NONE,
    startDate: task?.startDate ?? "",
    dueDate: task?.dueDate ?? "",
    dependsOn: task?.dependsOn ?? [],
    estimatedHours: task?.estimatedHours ?? 4,
    subtasks: task?.subtasks ?? [],
    labelIds: task?.labelIds ?? [],
    collaboratorIds: task?.collaboratorIds ?? [],
  }
}

interface Props {
  projectId: string
  /** An existing task, or defaults for a new one (e.g. the column it was added from) */
  task?: Partial<WorkTask>
  team: Employee[]
  milestones: Milestone[]
  /** Workspace task labels from settings */
  labels: TaskLabel[]
  /** Other tasks of the project, to choose predecessors from (PRJ-6) */
  projectTasks?: WorkTask[]
  /** Opens tasks named by their key in the description preview */
  resolveKey?: KeyResolver
  /** The project's statuses (P2) */
  states?: TaskState[]
  onValid: (input: WorkTaskInput) => void
}

export const TaskForm = forwardRef<TaskFormHandle, Props>(function TaskForm(
  { projectId, task, team, milestones, labels, projectTasks = [], resolveKey, states = DEFAULT_TASK_STATES, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(task, states) })
  const subtasks = useFieldArray({ control: form.control, name: "subtasks", keyName: "key" })
  const [newSubtask, setNewSubtask] = useState("")

  useEffect(() => {
    form.reset(toFormValues(task, states))
  }, [task, form, states])

  useImperativeHandle(ref, () => ({
    submit: () =>
      form.handleSubmit((v) =>
        onValid({
          ...v,
          status: (states.find((s) => s.id === v.stateId) ?? states[0]!).group,
          projectId,
          description: v.description || undefined,
          assigneeId: v.assigneeId === NONE ? undefined : v.assigneeId,
          collaboratorIds: v.collaboratorIds.filter((id) => id !== v.assigneeId),
          milestoneId: v.milestoneId === NONE ? undefined : v.milestoneId,
          startDate: v.startDate || undefined,
          dueDate: v.dueDate || undefined,
        })
      )(),
  }))

  const addSubtask = () => {
    const title = newSubtask.trim()
    if (!title) return
    subtasks.append({ id: createId("st"), title, done: false })
    setNewSubtask("")
  }

  const doneCount = form.watch("subtasks").filter((s) => s.done).length

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <TextField control={form.control} name="title" label={t("taskTitle")} />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="stateId"
            label={t("status")}
            options={states.map((s) => ({ value: s.id, label: stateLabel(s, t) }))}
          />
          <SelectField
            control={form.control}
            name="priority"
            label={t("priority")}
            options={Object.values(Priority).map((p) => ({ value: p, label: t(PRIORITY_LABEL[p]) }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="assigneeId"
            label={t("assignee")}
            options={[{ value: NONE, label: t("unassigned") }, ...team.map((e) => ({ value: e.id, label: e.name }))]}
          />
          <SelectField
            control={form.control}
            name="milestoneId"
            label={t("milestone")}
            options={[{ value: NONE, label: t("none") }, ...milestones.map((m) => ({ value: m.id, label: m.title }))]}
          />
        </div>

        <PeopleChips
          label={t("tkAlsoOn")}
          hint={t("tkAlsoOnHint")}
          people={team.filter((e) => e.id !== form.watch("assigneeId"))}
          value={form.watch("collaboratorIds")}
          onChange={(ids) => form.setValue("collaboratorIds", ids, { shouldDirty: true })}
        />

        <div className="grid grid-cols-3 gap-4">
          <TextField control={form.control} name="startDate" label={t("startDate")} type="date" />
          <TextField control={form.control} name="dueDate" label={t("dueDate")} type="date" />
          <NumberField control={form.control} name="estimatedHours" label={t("estimateHours")} />
        </div>

        {projectTasks.filter((x) => x.id !== task?.id).length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("waitsFor")}</span>
            <p className="-mt-1 text-xs text-muted-foreground">{t("waitsForHint")}</p>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-border p-2" role="group" aria-label={t("waitsFor")}>
              {projectTasks
                .filter((x) => x.id !== task?.id)
                .map((other) => {
                  const selected = form.watch("dependsOn")
                  const on = selected.includes(other.id)
                  return (
                    <label key={other.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-muted/60">
                      <Checkbox
                        checked={on}
                        onCheckedChange={(v) => form.setValue("dependsOn", v ? [...selected, other.id] : selected.filter((id) => id !== other.id), { shouldDirty: true })}
                      />
                      <span className="min-w-0 flex-1 truncate">{other.title}</span>
                      <span className="text-xs text-muted-foreground">{stateLabel(stateOf(other, states), t)}</span>
                    </label>
                  )
                })}
            </div>
          </div>
        )}

        {labels.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("labels")}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("labels")}>
              {labels.map((label) => {
                const selected = form.watch("labelIds")
                const on = selected.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      form.setValue("labelIds", on ? selected.filter((id) => id !== label.id) : [...selected, label.id], { shouldDirty: true })
                    }
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                      on ? "border-primary bg-info-soft text-info-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <RichTextEditor id="task-description" label={t("description")} value={form.watch("description") ?? ""} onChange={(v) => form.setValue("description", v, { shouldDirty: true })} resolve={resolveKey} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
            {t("subtasks")}
            {subtasks.fields.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {doneCount}/{subtasks.fields.length}
              </span>
            )}
          </legend>
          {subtasks.fields.map((sub, index) => (
            <div key={sub.key} className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5">
              <Checkbox
                checked={form.watch(`subtasks.${index}.done`)}
                aria-label={sub.title}
                onCheckedChange={(done) => form.setValue(`subtasks.${index}.done`, done, { shouldDirty: true })}
              />
              <Input
                {...form.register(`subtasks.${index}.title`)}
                aria-label={t("subtask")}
                className="h-8 border-transparent bg-transparent shadow-none focus-visible:border-primary"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("removeSubtask")}
                onClick={() => subtasks.remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSubtask()
                }
              }}
              placeholder={t("addSubtaskPlaceholder")}
              aria-label={t("addSubtask")}
            />
            <Button type="button" variant="outline" onClick={addSubtask} aria-label={t("addSubtask")}>
              <Plus className="size-4" />
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  )
})

/** Pick several people as toggles (P1). */
function PeopleChips({ label, hint, people, value, onChange }: { label: string; hint: string; people: Employee[]; value: string[]; onChange: (ids: string[]) => void }) {
  if (!people.length) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {people.map((e) => {
          const on = value.includes(e.id)
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((id) => id !== e.id) : [...value, e.id])}
              className={cn("h-8 rounded-full border px-3 text-xs font-medium transition-colors", on ? "border-primary bg-info-soft text-info-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}
            >
              {e.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
