"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { NumberField, SelectField, TextField } from "./form-fields"
import {
  EmployeeStatus,
  EmploymentType,
  WorkRole,
  DEFAULT_WORKING_DAYS,
  type Department,
  type Employee,
  type EmployeeInput,
} from "@/types/workforce"
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  NONE,
  WORK_ROLE_LABEL,
} from "./workforce-labels"
import { CustomFieldInputs, useCustomFields } from "./custom-fields"

export interface EmployeeFormHandle {
  submit: () => void
}

const money = z.number({ error: "required" }).min(0).max(100000)

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().optional(),
  jobTitle: z.string().trim().min(2),
  departmentId: z.string(),
  managerId: z.string(),
  role: z.enum(WorkRole),
  employmentType: z.enum(EmploymentType),
  status: z.enum(EmployeeStatus),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hourlyCost: money,
  billableRate: money,
  weeklyCapacity: z.number({ error: "required" }).min(0).max(80),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  skills: z.string(),
  customFields: z.record(z.string(), z.string().optional()),
})

type FormValues = z.infer<typeof schema>

function toFormValues(employee?: Employee): FormValues {
  return {
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    jobTitle: employee?.jobTitle ?? "",
    departmentId: employee?.departmentId ?? NONE,
    managerId: employee?.managerId ?? NONE,
    role: employee?.role ?? WorkRole.EMPLOYEE,
    employmentType: employee?.employmentType ?? EmploymentType.FULL_TIME,
    status: employee?.status ?? EmployeeStatus.ACTIVE,
    hireDate: employee?.hireDate ?? new Date().toISOString().slice(0, 10),
    hourlyCost: employee?.hourlyCost ?? 0,
    billableRate: employee?.billableRate ?? 0,
    weeklyCapacity: employee?.weeklyCapacity ?? 40,
    workingDays: employee?.workingDays?.length ? employee.workingDays : DEFAULT_WORKING_DAYS,
    skills: employee?.skills.join(", ") ?? "",
    customFields: employee?.customFields ?? {},
  }
}

function toInput(values: FormValues): EmployeeInput {
  return {
    ...values,
    // Checked and cleaned by useCustomFields when saving
    customFields: undefined,
    phone: values.phone || undefined,
    departmentId: values.departmentId === NONE ? undefined : values.departmentId,
    managerId: values.managerId === NONE ? undefined : values.managerId,
    skills: values.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

interface Props {
  employee?: Employee
  employees: Employee[]
  departments: Department[]
  currency: string
  /** Cost rates are hidden from roles without the costs permission (HR-6) */
  canSeeCosts: boolean
  onValid: (input: EmployeeInput) => void
}

// Monday first; values are JavaScript weekdays (0 = Sunday)
const WEEK = [1, 2, 3, 4, 5, 6, 0]

export const EmployeeForm = forwardRef<EmployeeFormHandle, Props>(function EmployeeForm(
  { employee, employees, departments, currency, canSeeCosts, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(employee),
  })

  useEffect(() => {
    form.reset(toFormValues(employee))
  }, [employee, form])

  const custom = useCustomFields("employee")

  useImperativeHandle(ref, () => ({
    submit: () =>
      form.handleSubmit((values) => {
        const customFields = custom.check(form, values.customFields)
        if (customFields !== false) onValid({ ...toInput(values), customFields })
      })(),
  }))

  const managers = employees.filter((e) => e.id !== employee?.id)

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <TextField control={form.control} name="name" label={t("fullName")} />
        <TextField control={form.control} name="email" label={t("email")} type="email" />
        <TextField control={form.control} name="phone" label={t("phone")} />
        <TextField control={form.control} name="jobTitle" label={t("jobTitle")} />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="departmentId"
            label={t("department")}
            options={[
              { value: NONE, label: t("none") },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <SelectField
            control={form.control}
            name="managerId"
            label={t("manager")}
            options={[
              { value: NONE, label: t("none") },
              ...managers.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="role"
            label={t("accessRole")}
            options={Object.values(WorkRole).map((r) => ({ value: r, label: t(WORK_ROLE_LABEL[r]) }))}
          />
          <SelectField
            control={form.control}
            name="employmentType"
            label={t("employmentType")}
            options={Object.values(EmploymentType).map((v) => ({
              value: v,
              label: t(EMPLOYMENT_TYPE_LABEL[v]),
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="status"
            label={t("status")}
            options={Object.values(EmployeeStatus).map((v) => ({
              value: v,
              label: t(EMPLOYEE_STATUS_LABEL[v]),
            }))}
          />
          <TextField control={form.control} name="hireDate" label={t("hireDate")} type="date" />
        </div>

        <div className={cn("grid gap-4", canSeeCosts ? "grid-cols-3" : "grid-cols-2")}>
          {canSeeCosts && <NumberField control={form.control} name="hourlyCost" label={`${t("hourlyCost")} (${currency})`} />}
          <NumberField control={form.control} name="billableRate" label={`${t("billableRate")} (${currency})`} />
          <NumberField control={form.control} name="weeklyCapacity" label={t("hoursPerWeek")} />
        </div>

        {employee && <p className="-mt-2 text-xs text-muted-foreground">{t("rateEditHint")}</p>}

        <FormField
          control={form.control}
          name="workingDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("workingDays")}</FormLabel>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("workingDays")}>
                {WEEK.map((day) => {
                  const on = field.value.includes(day)
                  const label = new Date(2026, 0, 4 + day).toLocaleDateString(undefined, { weekday: "short" })
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? field.value.filter((d) => d !== day) : [...field.value, day].sort())}
                      className={cn(
                        "h-9 min-w-12 rounded-full border px-3 text-[13px] font-medium transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <CustomFieldInputs entity="employee" />

        <TextField
          control={form.control}
          name="skills"
          label={t("skills")}
          placeholder={t("skillsPlaceholder")}
        />
      </form>
    </Form>
  )
})
