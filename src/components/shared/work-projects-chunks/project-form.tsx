"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { ClientStatus, EmployeeStatus, type Client, type Employee } from "@/types/workforce"
import {
  BudgetType,
  Priority,
  WorkProjectStatus,
  type WorkProject,
  type WorkProjectInput,
} from "@/types/work-projects"
import { NumberField, SelectField, TextAreaField, TextField } from "../workforce-chunks/form-fields"
import { NONE } from "../workforce-chunks/workforce-labels"
import { BUDGET_TYPE_LABEL, PRIORITY_LABEL, PROJECT_STATUS_LABEL } from "./project-labels"
import { todayIso } from "@/lib/workforce/project-metrics"

export interface ProjectFormHandle {
  submit: () => void
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const schema = z
  .object({
    name: z.string().trim().min(2),
    code: z.string().trim().min(2).max(12),
    description: z.string().optional(),
    clientId: z.string(),
    managerId: z.string(),
    memberIds: z.array(z.string()),
    status: z.enum(WorkProjectStatus),
    priority: z.enum(Priority),
    startDate: isoDate,
    dueDate: z.union([z.literal(""), isoDate]),
    budgetType: z.enum(BudgetType),
    budgetAmount: z.number().min(0).optional(),
    retainerMonthly: z.number().min(0).optional(),
    retainerHours: z.number().min(0).optional(),
    retainerOverage: z.number().min(0).optional(),
  })
  .refine((v) => !v.dueDate || v.dueDate >= v.startDate, { path: ["dueDate"], message: "dueBeforeStart" })
  .refine((v) => v.budgetType !== BudgetType.RETAINER || (v.retainerMonthly ?? 0) > 0, { path: ["retainerMonthly"], message: "required" })

type FormValues = z.infer<typeof schema>

function toFormValues(project?: WorkProject): FormValues {
  return {
    name: project?.name ?? "",
    code: project?.code ?? "",
    description: project?.description ?? "",
    clientId: project?.clientId ?? NONE,
    managerId: project?.managerId ?? NONE,
    memberIds: project?.memberIds ?? [],
    status: project?.status ?? WorkProjectStatus.PLANNING,
    priority: project?.priority ?? Priority.MEDIUM,
    startDate: project?.startDate ?? todayIso(),
    dueDate: project?.dueDate ?? "",
    budgetType: project?.budgetType ?? BudgetType.FIXED,
    budgetAmount: project?.budgetAmount,
    retainerMonthly: project?.retainer?.monthlyAmount,
    retainerHours: project?.retainer?.includedHours,
    retainerOverage: project?.retainer?.overageRate,
  }
}

function toInput(values: FormValues): WorkProjectInput {
  const { retainerMonthly, retainerHours, retainerOverage, ...rest } = values
  return {
    ...rest,
    retainer:
      values.budgetType === BudgetType.RETAINER
        ? { monthlyAmount: retainerMonthly ?? 0, includedHours: retainerHours ?? 0, overageRate: retainerOverage ?? 0 }
        : undefined,
    code: values.code.toUpperCase(),
    description: values.description || undefined,
    clientId: values.clientId === NONE ? undefined : values.clientId,
    managerId: values.managerId === NONE ? undefined : values.managerId,
    dueDate: values.dueDate || undefined,
    budgetAmount: values.budgetType === BudgetType.NON_BILLABLE || values.budgetType === BudgetType.RETAINER ? undefined : values.budgetAmount,
  }
}

/** Suggests a project code from the client's (or project's) name, e.g. "Orbit" → "ORB-03". */
export function suggestCode(source: string, existingCodes: string[]) {
  const prefix = source.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "PRJ"
  for (let n = 1; n < 100; n++) {
    const code = `${prefix}-${String(n).padStart(2, "0")}`
    if (!existingCodes.includes(code)) return code
  }
  return `${prefix}-${Date.now() % 1000}`
}

interface Props {
  project?: WorkProject
  clients: Client[]
  employees: Employee[]
  existingCodes: string[]
  currency: string
  onValid: (input: WorkProjectInput) => void
}

export const ProjectForm = forwardRef<ProjectFormHandle, Props>(function ProjectForm(
  { project, clients, employees, existingCodes, currency, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(project) })

  useEffect(() => {
    form.reset(toFormValues(project))
  }, [project, form])

  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit((values) => onValid(toInput(values)))(),
  }))

  // New projects get a code as soon as there is a name or client to build it from
  const clientId = form.watch("clientId")
  const name = form.watch("name")
  useEffect(() => {
    if (project || form.getFieldState("code").isDirty) return
    const source = clients.find((c) => c.id === clientId)?.name ?? name
    if (source) form.setValue("code", suggestCode(source, existingCodes))
  }, [clientId, name, project, clients, existingCodes, form])

  const budgetType = form.watch("budgetType")
  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE)

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-[1fr_8rem] gap-4">
          <TextField control={form.control} name="name" label={t("projectName")} />
          <TextField control={form.control} name="code" label={t("code")} placeholder="ABC-01" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="clientId"
            label={t("client")}
            options={[{ value: NONE, label: t("internalProject") }, ...clients
              // Archived clients can't get new projects, but an existing project keeps its client
              .filter((c) => c.status !== ClientStatus.ARCHIVED || c.id === project?.clientId)
              .map((c) => ({ value: c.id, label: c.name }))]}
          />
          <SelectField
            control={form.control}
            name="managerId"
            label={t("projectManager")}
            options={[{ value: NONE, label: t("none") }, ...staff.map((e) => ({ value: e.id, label: e.name }))]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="status"
            label={t("status")}
            options={Object.values(WorkProjectStatus).map((s) => ({ value: s, label: t(PROJECT_STATUS_LABEL[s]) }))}
          />
          <SelectField
            control={form.control}
            name="priority"
            label={t("priority")}
            options={Object.values(Priority).map((p) => ({ value: p, label: t(PRIORITY_LABEL[p]) }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField control={form.control} name="startDate" label={t("startDate")} type="date" />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t("dueDate")}</FormLabel>
                <input
                  type="date"
                  {...field}
                  className="flex h-10 w-full rounded-xl border border-border bg-input px-3.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary"
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message === "dueBeforeStart" ? t("dueBeforeStart") : fieldState.error.message}
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="budgetType"
            label={t("budget")}
            options={Object.values(BudgetType).map((b) => ({ value: b, label: t(BUDGET_TYPE_LABEL[b]) }))}
          />
          {budgetType !== BudgetType.NON_BILLABLE && budgetType !== BudgetType.RETAINER && (
            <NumberField
              control={form.control}
              name="budgetAmount"
              label={`${budgetType === BudgetType.FIXED ? t("fixedPrice") : t("budgetCap")} (${currency})`}
              optional
              placeholder={t("optional")}
            />
          )}
        </div>

        {budgetType === BudgetType.RETAINER && (
          <div className="grid grid-cols-3 gap-4">
            <NumberField control={form.control} name="retainerMonthly" label={`${t("monthlyAmount")} (${currency})`} />
            <NumberField control={form.control} name="retainerHours" label={t("includedHours")} optional />
            <NumberField control={form.control} name="retainerOverage" label={`${t("overageRate")} (${currency})`} optional />
          </div>
        )}

        <FormField
          control={form.control}
          name="memberIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("team")}</FormLabel>
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-card p-1.5">
                {staff.map((employee) => {
                  const checked = field.value.includes(employee.id)
                  const isManager = employee.id === form.watch("managerId")
                  return (
                    <label
                      key={employee.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked || isManager}
                        disabled={isManager}
                        aria-label={employee.name}
                        onCheckedChange={(next) =>
                          field.onChange(next ? [...field.value, employee.id] : field.value.filter((id) => id !== employee.id))
                        }
                      />
                      <SpaceAvatar name={employee.name} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{employee.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {isManager ? t("projectManager") : employee.jobTitle}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <TextAreaField control={form.control} name="description" label={t("description")} />
      </form>
    </Form>
  )
})
