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
import {
  Priority,
  TaskStatus,
  type Milestone,
  type WorkTask,
  type WorkTaskInput,
} from "@/types/work-projects"
import { NumberField, SelectField, TextAreaField, TextField } from "../workforce-chunks/form-fields"
import { NONE } from "../workforce-chunks/workforce-labels"
import { PRIORITY_LABEL, TASK_STATUS_LABEL } from "./project-labels"

export interface TaskFormHandle {
  submit: () => void
}

const schema = z.object({
  title: z.string().trim().min(2),
  description: z.string().optional(),
  status: z.enum(TaskStatus),
  priority: z.enum(Priority),
  assigneeId: z.string(),
  milestoneId: z.string(),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  estimatedHours: z.number({ error: "required" }).min(0).max(1000),
  subtasks: z.array(z.object({ id: z.string(), title: z.string().trim().min(1), done: z.boolean() })),
})

type FormValues = z.infer<typeof schema>

function toFormValues(task?: Partial<WorkTask>): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? TaskStatus.TODO,
    priority: task?.priority ?? Priority.MEDIUM,
    assigneeId: task?.assigneeId ?? NONE,
    milestoneId: task?.milestoneId ?? NONE,
    dueDate: task?.dueDate ?? "",
    estimatedHours: task?.estimatedHours ?? 4,
    subtasks: task?.subtasks ?? [],
  }
}

interface Props {
  projectId: string
  /** An existing task, or defaults for a new one (e.g. the column it was added from) */
  task?: Partial<WorkTask>
  team: Employee[]
  milestones: Milestone[]
  onValid: (input: WorkTaskInput) => void
}

export const TaskForm = forwardRef<TaskFormHandle, Props>(function TaskForm(
  { projectId, task, team, milestones, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(task) })
  const subtasks = useFieldArray({ control: form.control, name: "subtasks", keyName: "key" })
  const [newSubtask, setNewSubtask] = useState("")

  useEffect(() => {
    form.reset(toFormValues(task))
  }, [task, form])

  useImperativeHandle(ref, () => ({
    submit: () =>
      form.handleSubmit((v) =>
        onValid({
          ...v,
          projectId,
          description: v.description || undefined,
          assigneeId: v.assigneeId === NONE ? undefined : v.assigneeId,
          milestoneId: v.milestoneId === NONE ? undefined : v.milestoneId,
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
            name="status"
            label={t("status")}
            options={Object.values(TaskStatus).map((s) => ({ value: s, label: t(TASK_STATUS_LABEL[s]) }))}
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

        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="dueDate" label={t("dueDate")} type="date" />
          <NumberField control={form.control} name="estimatedHours" label={t("estimateHours")} />
        </div>

        <TextAreaField control={form.control} name="description" label={t("description")} />

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
