"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useLocale, useTranslations } from "next-intl"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { NumberField, SelectField, TextField } from "./form-fields"
import { Button } from "@/components/ui/button"
import { employerCost } from "@/lib/workforce/employer-cost"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
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
  cin: z.string().trim().max(20).optional(),
  cnssNumber: z.union([z.literal(""), z.string().trim().regex(/^\d{9}$/, "9 digits")]).optional(),
  grossMonthlySalary: z.number().min(0).max(10000000).optional(),
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
    cin: employee?.cin ?? "",
    cnssNumber: employee?.cnssNumber ?? "",
    grossMonthlySalary: employee?.grossMonthlySalary,
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
    cin: values.cin?.toUpperCase() || undefined,
    cnssNumber: values.cnssNumber || undefined,
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
  const locale = useLocale()
  const country = useWorkspaceSettings().data?.company.country ?? "MA"
  const moroccan = country === "MA"
  const [watchedGross, watchedWeekly, watchedHourlyCost] = form.watch(["grossMonthlySalary", "weeklyCapacity", "hourlyCost"])
  const cost = typeof watchedGross === "number" && Number.isFinite(watchedGross) ? employerCost(watchedGross, Number(watchedWeekly) || 0, country) : null
  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n)

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

        {canSeeCosts && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">{t("realCostTitle")}</p>
              <p className="text-xs text-muted-foreground">{t(moroccan ? "realCostHintMa" : "realCostHint")}</p>
            </div>
            {moroccan && (
              <div className="grid grid-cols-2 gap-4">
                <TextField control={form.control} name="cin" label={t("employeeCin")} />
                <TextField control={form.control} name="cnssNumber" label={t("employeeCnss")} />
              </div>
            )}
            <NumberField control={form.control} name="grossMonthlySalary" label={`${t("grossMonthlySalary")} (${currency})`} optional />
            {cost && cost.gross > 0 && (
              <>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                  {cost.lines.map((l) => (
                    <div key={l.key} className="contents">
                      <dt className="text-muted-foreground">{t(`empCharge_${l.key}`)} · {l.rate}%{l.base < cost.gross ? ` ${t("empChargeCapped", { amount: money(l.base) })}` : ""}</dt>
                      <dd className="text-end tabular-nums">{money(l.amount)}</dd>
                    </div>
                  ))}
                  <dt className="font-medium">{t("employerMonthlyCost")}</dt>
                  <dd className="text-end font-medium tabular-nums">{money(cost.monthlyCost)}</dd>
                  <dt className="text-muted-foreground">{t("workedHoursYear")}</dt>
                  <dd className="text-end tabular-nums">{cost.yearlyHours.toLocaleString(locale)} h</dd>
                  <dt className="font-semibold">{t("realHourlyCost")}</dt>
                  <dd className="text-end font-semibold tabular-nums">{money(cost.hourlyCost)}</dd>
                </dl>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={cost.hourlyCost === watchedHourlyCost}
                  onClick={() => form.setValue("hourlyCost", cost.hourlyCost, { shouldDirty: true, shouldValidate: true })}
                >
                  {t("useAsHourlyCost")}
                </Button>
              </>
            )}
          </div>
        )}

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
