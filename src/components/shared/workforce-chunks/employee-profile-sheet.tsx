"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRateChange } from "@/hooks/workforce/use-workforce"
import { useDocuments } from "@/hooks/workforce/use-documents"
import { useQuery } from "@tanstack/react-query"
import { listAccountsApi } from "@/lib/api/access-api"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { currentContract, documentStatus, latestDocuments } from "@/lib/workforce/documents"
import { Link } from "@/i18n/navigation"
import { CONTRACT_TYPE_LABEL, DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_CLASS, DOCUMENT_STATUS_LABEL } from "../work-hr-chunks/hr-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import { todayIso } from "@/lib/workforce/project-metrics"
import { DEFAULT_WORKING_DAYS } from "@/types/workforce"
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
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { fieldsFor } from "@/lib/workforce/custom-fields"
import { CustomFieldValuesList } from "./custom-fields"
import { Star } from "@/components/ui/carbon/icons"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { averageRating, canSeeReview } from "@/lib/workforce/reviews"
import { useReviews } from "../work-reviews-chunks/use-reviews"
import { REVIEW_STATUS_CLASS, REVIEW_STATUS_LABEL } from "../work-reviews-chunks/review-labels"

interface Props {
  employee: Employee | null
  employees: Employee[]
  departments: Department[]
  currency: string
  canSeeCosts: boolean
  canEditRates: boolean
  /** HR documents and contracts are shown to people who can edit employees */
  canSeeDocuments?: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (employee: Employee) => void
}

/** Read-only employee profile: details, rates and the reporting line. */
export function EmployeeProfileSheet({ employee, employees, departments, currency, canSeeCosts, canEditRates, canSeeDocuments = false, onOpenChange, onSelect }: Props) {
  const t = useTranslations()
  const { data: settings } = useWorkspaceSettings()
  const locale = useLocale()
  const manager = employee?.managerId ? employees.find((e) => e.id === employee.managerId) : undefined
  const reports = employee ? employees.filter((e) => e.managerId === employee.id) : []
  const department = departments.find((d) => d.id === employee?.departmentId)
  const { data: allDocs = [] } = useDocuments()
  const { id: wsId } = useCurrentWorkspace()
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts", wsId], queryFn: () => listAccountsApi(wsId), enabled: canSeeDocuments })
  const account = employee ? accounts.find((a) => a.employeeId === employee.id) : undefined
  const today = todayIso()
  // Reviews of this person the viewer is allowed to see (HR-9)
  const { authedUser } = useAuthGuard()
  const currentEmployee = useCurrentEmployee()
  const { data: allReviews = [] } = useReviews()
  const reviewViewer = { employeeId: currentEmployee?.id, isAdmin: can(authedUser, AdminPermissionsPlatform.ROLES_UPDATE) }
  const personReviews = employee
    ? allReviews.filter((r) => r.employeeId === employee.id && canSeeReview(r, reviewViewer, employees)).sort((a, b) => b.to.localeCompare(a.to))
    : []
  const docs = employee && canSeeDocuments ? latestDocuments(allDocs.filter((d) => d.employeeId === employee.id)) : []
  const contract = employee ? currentContract(docs, employee.id, today) : undefined

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
                <Row
                  label={t("workingDays")}
                  value={(employee.workingDays?.length ? employee.workingDays : DEFAULT_WORKING_DAYS)
                    .map((d) => new Date(2026, 0, 4 + d).toLocaleDateString(locale, { weekday: "short" }))
                    .join(" · ")}
                />
              </Section>

              <Section title={t("rates")}>
                {canSeeCosts && <Row label={t("hourlyCost")} value={`${formatMoney(employee.hourlyCost, currency)}/h`} />}
                <Row
                  label={t("billableRate")}
                  value={employee.billableRate > 0 ? `${formatMoney(employee.billableRate, currency)}/h` : t("notBillable")}
                />
              </Section>

              {canSeeCosts && (employee.rateHistory?.length ?? 0) > 0 && (
                <Section title={t("rateHistory")}>
                  <ul className="flex flex-col divide-y divide-border">
                    {[...employee.rateHistory!].reverse().map((c) => (
                      <li key={c.effectiveFrom} className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                        <span className="min-w-0">
                          <span className="block font-medium tabular-nums">
                            {t("fromDate", { date: new Date(`${c.effectiveFrom}T00:00:00`).toLocaleDateString(locale, { dateStyle: "medium" }) })}
                            {c.effectiveFrom > todayIso() && <span className="ms-2 rounded-full bg-info-soft px-2 py-0.5 text-xs text-info-foreground">{t("upcoming")}</span>}
                          </span>
                          {c.reason && <span className="block text-xs text-muted-foreground">{c.reason}</span>}
                        </span>
                        <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {t("costShort")} {formatMoney(c.hourlyCost, currency)}
                          <br />
                          {t("rateShort")} {formatMoney(c.billableRate, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {canEditRates && <RateChangeForm key={employee.id} employeeId={employee.id} hireDate={employee.hireDate} currency={currency} initial={employee} />}

              {canSeeDocuments && (
                <Section title={t("documentsAndContracts")}>
                  <Row
                    label={t("currentContract")}
                    value={contract?.contractType ? `${t(CONTRACT_TYPE_LABEL[contract.contractType])}${contract.expiryDate ? ` · ${t("until")} ${formatShortDate(contract.expiryDate, locale)}` : ""}` : t("noContract")}
                  />
                  {docs.length > 0 && (
                    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                      {docs.map((d) => {
                        const status = documentStatus(d, today)
                        return (
                          <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{d.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {t(DOCUMENT_KIND_LABEL[d.kind])}
                                {d.expiryDate ? ` · ${formatShortDate(d.expiryDate, locale)}` : ""}
                              </span>
                            </span>
                            <Badge variant="outline" className={DOCUMENT_STATUS_CLASS[status]}>{t(DOCUMENT_STATUS_LABEL[status])}</Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <Link href="/dashboard/documents" className="text-sm text-primary hover:underline">{t("manageDocuments")}</Link>
                  <Row label={t("signInAccess")} value={<Link href="/dashboard/access" className="text-primary hover:underline">{t(`access_${account?.status ?? "none"}`)}</Link>} />
                </Section>
              )}

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

              {personReviews.length > 0 && (
                <Section title={t("reviews")}>
                  <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                    {personReviews.slice(0, 4).map((r) => {
                      const avg = averageRating(r.manager?.ratings)
                      return (
                        <li key={r.id}>
                          <Link href="/dashboard/reviews" className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60">
                            <span className="min-w-0 flex-1 truncate font-medium">{r.period}</span>
                            {avg !== null && <span className="flex items-center gap-1 tabular-nums"><Star className="size-3.5 fill-primary text-primary" />{avg}</span>}
                            <Badge variant="outline" className={REVIEW_STATUS_CLASS[r.status]}>{t(REVIEW_STATUS_LABEL[r.status])}</Badge>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}
              {fieldsFor(settings?.customFields, "employee").some((d) => employee.customFields?.[d.id]) && (
                <Section title={t("customFields")}>
                  <CustomFieldValuesList entity="employee" values={employee.customFields} />
                </Section>
              )}
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

/** Records new rates from a date; earlier work keeps the rates it was done at (BR-4). */
function RateChangeForm({
  employeeId,
  hireDate,
  currency,
  initial,
}: {
  employeeId: string
  hireDate: string
  currency: string
  initial: { hourlyCost: number; billableRate: number }
}) {
  const t = useTranslations()
  const change = useRateChange()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ effectiveFrom: todayIso(), hourlyCost: initial.hourlyCost, billableRate: initial.billableRate, reason: "" })

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("changeRates")}
      </Button>
    )
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        change.mutate({ id: employeeId, change: form }, { onSuccess: () => setOpen(false) })
      }}
    >
      <p className="text-sm font-medium">{t("changeRates")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="rate-from">{t("effectiveFrom")}</Label>
          <Input id="rate-from" type="date" min={hireDate} value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-cost">{`${t("hourlyCost")} (${currency})`}</Label>
          <Input id="rate-cost" type="number" min={0} value={form.hourlyCost} onChange={(e) => setForm((f) => ({ ...f, hourlyCost: Number(e.target.value) }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate-bill">{`${t("billableRate")} (${currency})`}</Label>
          <Input id="rate-bill" type="number" min={0} value={form.billableRate} onChange={(e) => setForm((f) => ({ ...f, billableRate: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="rate-reason">{t("reason")}</Label>
          <Input id="rate-reason" value={form.reason} placeholder={t("rateReasonPlaceholder")} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("rateChangeHint")}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
        <Button type="submit" disabled={change.isPending}>{t("saveRates")}</Button>
      </div>
    </form>
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
