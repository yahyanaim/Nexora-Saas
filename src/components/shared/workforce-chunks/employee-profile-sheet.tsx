"use client"

import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import type { Department, Employee } from "@/types/workforce"
import {
  EMPLOYEE_STATUS_CLASS,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  WORK_ROLE_LABEL,
  formatMoney,
} from "./workforce-labels"

interface Props {
  employee: Employee | null
  employees: Employee[]
  departments: Department[]
  currency: string
  onOpenChange: (open: boolean) => void
  onSelect: (employee: Employee) => void
}

/** Read-only employee profile: details, rates and the reporting line. */
export function EmployeeProfileSheet({ employee, employees, departments, currency, onOpenChange, onSelect }: Props) {
  const t = useTranslations()
  const manager = employee?.managerId ? employees.find((e) => e.id === employee.managerId) : undefined
  const reports = employee ? employees.filter((e) => e.managerId === employee.id) : []
  const department = departments.find((d) => d.id === employee?.departmentId)

  return (
    <Sheet open={!!employee} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {employee && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <SpaceAvatar name={employee.name} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{employee.name}</SheetTitle>
                  <SheetDescription className="truncate">{employee.jobTitle}</SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className={EMPLOYEE_STATUS_CLASS[employee.status]}>
                  {t(EMPLOYEE_STATUS_LABEL[employee.status])}
                </Badge>
                <Badge variant="outline">{t(WORK_ROLE_LABEL[employee.role])}</Badge>
                <Badge variant="outline">{t(EMPLOYMENT_TYPE_LABEL[employee.employmentType])}</Badge>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <Section title={t("contact")}>
                <Row label={t("email")} value={<a className="text-info-foreground hover:underline" href={`mailto:${employee.email}`}>{employee.email}</a>} />
                <Row label={t("phone")} value={employee.phone || "—"} />
              </Section>

              <Section title={t("employment")}>
                <Row label={t("department")} value={department?.name ?? "—"} />
                <Row label={t("hireDate")} value={employee.hireDate} />
                <Row label={t("hoursPerWeek")} value={`${employee.weeklyCapacity} h`} />
              </Section>

              <Section title={t("rates")}>
                <Row label={t("hourlyCost")} value={`${formatMoney(employee.hourlyCost, currency)}/h`} />
                <Row
                  label={t("billableRate")}
                  value={employee.billableRate > 0 ? `${formatMoney(employee.billableRate, currency)}/h` : t("notBillable")}
                />
              </Section>

              <Section title={t("reportingLine")}>
                <Row
                  label={t("manager")}
                  value={manager ? <PersonLink employee={manager} onSelect={onSelect} /> : "—"}
                />
                <Row
                  label={t("directReports")}
                  value={
                    reports.length ? (
                      <span className="flex flex-col items-end gap-1">
                        {reports.map((r) => (
                          <PersonLink key={r.id} employee={r} onSelect={onSelect} />
                        ))}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              </Section>

              {employee.skills.length > 0 && (
                <Section title={t("skills")}>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-normal">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function PersonLink({ employee, onSelect }: { employee: Employee; onSelect: (e: Employee) => void }) {
  return (
    <button type="button" onClick={() => onSelect(employee)} className="text-info-foreground hover:underline">
      {employee.name}
    </button>
  )
}
