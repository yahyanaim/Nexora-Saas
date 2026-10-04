"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useQueryClient } from "@tanstack/react-query"
import { deleteWorkspaceDataApi, exportWorkspaceDataApi } from "@/lib/api/data-export-api"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useDepartments, useEmployees } from "@/hooks/workforce/use-workforce"
import { useSettingsMutations, useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { createId } from "@/lib/workforce/demo-store"
import { LEAVE_TYPE_LABEL } from "../work-planning-chunks/planning-labels"
import { DEFAULT_CARRY_OVER_DAYS, LeaveType } from "@/types/work-planning"
import { EXPENSE_CATEGORY_LABEL } from "../work-costs-chunks/cost-labels"
import {
  AMOUNT_SUBJECTS,
  ApprovalMode,
  ApprovalSubject,
  type ApprovalRule,
  type CompanySettings,
  type Holiday,
  type WorkspaceSettings,
} from "@/types/work-settings"

const CURRENCIES = ["MAD", "EUR", "USD", "GBP", "CAD", "AED", "SAR", "CHF"]
const COUNTRIES = ["MA", "FR", "BE", "CH", "ES", "DE", "GB", "US", "CA", "AE", "SA", "TN", "DZ", "SN"]
const TIME_ZONES = ["Africa/Casablanca", "Europe/Paris", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Africa/Tunis"]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const SUBJECT_LABEL: Record<ApprovalSubject, string> = {
  [ApprovalSubject.TIMESHEET]: "timesheets",
  [ApprovalSubject.LEAVE]: "leave",
  [ApprovalSubject.EXPENSE]: "expenses",
  [ApprovalSubject.QUOTE]: "quotes",
  [ApprovalSubject.INVOICE]: "invoices",
}
const SUBJECT_HINT: Record<ApprovalSubject, string> = {
  [ApprovalSubject.TIMESHEET]: "approvalHintTimesheet",
  [ApprovalSubject.LEAVE]: "approvalHintLeave",
  [ApprovalSubject.EXPENSE]: "approvalHintExpense",
  [ApprovalSubject.QUOTE]: "approvalHintQuote",
  [ApprovalSubject.INVOICE]: "approvalHintInvoice",
}
const MODE_LABEL: Record<ApprovalMode, string> = {
  [ApprovalMode.NONE]: "noApproval",
  [ApprovalMode.ONE_STEP]: "oneStep",
  [ApprovalMode.TWO_STEP]: "twoSteps",
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SaveBar({ onSave, pending }: { onSave: () => void; pending: boolean }) {
  const t = useTranslations()
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button onClick={onSave} disabled={pending}>
        {t("saveChanges")}
      </Button>
    </div>
  )
}

function CompanyTab({ initial }: { initial: CompanySettings }) {
  const t = useTranslations()
  const { company } = useSettingsMutations()
  const [form, setForm] = useState(initial)
  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => setForm((f) => ({ ...f, [key]: value }))
  const text = (key: keyof CompanySettings, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input value={String(form[key] ?? "")} onChange={(e) => set(key, e.target.value as never)} />
    </Field>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("companyIdentity")}</CardTitle>
        <CardDescription>{t("companyIdentityHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("legalName", t("legalName"))}
          {text("tradeName", t("tradeName"))}
          {text("ice", t("iceNumber"), t("iceHint"))}
          {text("taxId", t("taxIdentifier"))}
          {text("tradeRegister", t("tradeRegister"))}
          {text("address", t("address"))}
          {text("city", t("city"))}
          <Field label={t("country")}>
            <Select value={form.country} onValueChange={(v) => set("country", v)}>
              <SelectTrigger><SelectValue>{form.country}</SelectValue></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("baseCurrency")} hint={t("baseCurrencyHint")}>
            <Select value={form.baseCurrency} onValueChange={(v) => set("baseCurrency", v)}>
              <SelectTrigger><SelectValue>{form.baseCurrency}</SelectValue></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("fiscalYearStarts")}>
            <Select value={String(form.fiscalYearStartMonth)} onValueChange={(v) => set("fiscalYearStartMonth", Number(v))}>
              <SelectTrigger>
                <SelectValue>{new Date(2026, form.fiscalYearStartMonth - 1, 1).toLocaleString(undefined, { month: "long" })}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(2026, m - 1, 1).toLocaleString(undefined, { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("weekStartsOn")}>
            <Select value={form.weekStart} onValueChange={(v) => set("weekStart", v as CompanySettings["weekStart"])}>
              <SelectTrigger><SelectValue>{t(form.weekStart)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">{t("monday")}</SelectItem>
                <SelectItem value="sunday">{t("sunday")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("timeZone")}>
            <Select value={form.timeZone} onValueChange={(v) => set("timeZone", v)}>
              <SelectTrigger><SelectValue>{form.timeZone}</SelectValue></SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("invoiceNumberFormat")} hint={t("invoiceNumberFormatHint", { YYYY: "{YYYY}", SEQ: "{SEQ}" })}>
            <Input className="font-mono" value={form.invoiceNumberFormat} onChange={(e) => set("invoiceNumberFormat", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-1 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">{t("invoiceDetails")}</h3>
          <p className="text-sm text-muted-foreground">{t("invoiceDetailsHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt={t("companyLogo")} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">{(form.tradeName || form.legalName).slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor="company-logo">{t("companyLogo")}</Label>
            <p className="text-xs text-muted-foreground">{t("companyLogoHint")}</p>
          </div>
          <div className="flex gap-2">
            <Input
              id="company-logo"
              type="file"
              accept="image/png,image/jpeg"
              className="w-56"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 300 * 1024) {
                  toast.error(t("companyLogoInvalid"))
                  return
                }
                const reader = new FileReader()
                reader.onload = () => set("logoDataUrl", String(reader.result))
                reader.readAsDataURL(file)
              }}
            />
            {form.logoDataUrl && (
              <Button variant="outline" onClick={() => set("logoDataUrl", undefined)}>
                {t("removeLogo")}
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("phone", t("phone"))}
          {text("email", t("billingEmail"))}
          {text("website", t("website"))}
          {text("bankName", t("bankName"))}
          {text("bankAccount", t("bankAccount"), t("bankAccountHint"))}
          {text("bankSwift", t("bankSwift"))}
          {text("shareCapital", t("shareCapital"))}
          <Field label={t("brandColor")} hint={t("brandColorHint")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t("brandColor")}
                value={form.brandColor || "#2563eb"}
                onChange={(e) => set("brandColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-card p-1"
              />
              <Input className="font-mono" value={form.brandColor ?? ""} placeholder="#2563eb" onChange={(e) => set("brandColor", e.target.value || undefined)} />
            </div>
          </Field>
        </div>
        <Field label={t("invoiceFooter")} hint={t("invoiceFooterHint")}>
          <Textarea rows={2} value={form.invoiceFooter ?? ""} onChange={(e) => set("invoiceFooter", e.target.value)} />
        </Field>
        <SaveBar onSave={() => company.mutate(form)} pending={company.isPending} />
      </CardContent>
    </Card>
  )
}

/** Locks every record dated on or before a day (BR-7). */
function PeriodLockCard({ initial }: { initial?: string }) {
  const t = useTranslations()
  const { periodLock } = useSettingsMutations()
  const [date, setDate] = useState(initial ?? "")
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("periodLock")}</CardTitle>
        <CardDescription>{initial ? t("periodLockedThrough", { date: initial }) : t("periodLockHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lock-date">{t("lockThrough")}</Label>
          <Input id="lock-date" type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="outline" disabled={!date || date === initial || periodLock.isPending} onClick={() => periodLock.mutate(date)}>
          {t("lockPeriod")}
        </Button>
        {initial && (
          <Button variant="ghost" disabled={periodLock.isPending} onClick={() => periodLock.mutate(null, { onSuccess: () => setDate("") })}>
            {t("unlock")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Full export and deletion on request (PLT-14). */
function DataCard() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const download = async () => {
    const data = await exportWorkspaceDataApi(workspace.id)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-export.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("yourData")}</CardTitle>
        <CardDescription>{t("yourDataHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download}>{t("exportAllData")}</Button>
        <Button variant="destructive" onClick={() => setConfirming(true)}>{t("deleteAllData")}</Button>
        <ConfirmAlertDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t("deleteAllData")}
          description={t("deleteAllDataConfirm", { name: workspace.name })}
          confirmLabel={t("delete")}
          destructive
          onConfirm={async () => {
            await deleteWorkspaceDataApi(workspace.id)
            setConfirming(false)
            await queryClient.invalidateQueries()
            toast.success(t("dataDeleted"))
          }}
        />
      </CardContent>
    </Card>
  )
}

function DepartmentsCard() {
  const t = useTranslations()
  const { data: departments = [] } = useDepartments()
  const { data: employees = [] } = useEmployees()
  const { createDepartment, renameDepartment, deleteDepartment } = useSettingsMutations()
  const [name, setName] = useState("")
  const used = employees.map((e) => e.departmentId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("departments")}</CardTitle>
        <CardDescription>{t("departmentsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {departments.map((d) => {
            const count = used.filter((id) => id === d.id).length
            return (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                <Input
                  aria-label={t("departmentName")}
                  defaultValue={d.name}
                  className="h-9 flex-1 border-transparent bg-transparent shadow-none focus-visible:border-border"
                  onBlur={(e) => e.target.value.trim() !== d.name && renameDepartment.mutate({ id: d.id, name: e.target.value })}
                />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{t("peopleCount", { count })}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("delete")}
                  disabled={count > 0}
                  onClick={() => deleteDepartment.mutate({ id: d.id, used })}
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            createDepartment.mutate(name, { onSuccess: () => setName("") })
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("newDepartment")} aria-label={t("newDepartment")} />
          <Button type="submit" variant="outline" disabled={!name.trim()}>
            <Plus /> {t("add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function HolidaysCard({ initial }: { initial: Holiday[] }) {
  const t = useTranslations()
  const { holidays } = useSettingsMutations()
  const [rows, setRows] = useState(initial)
  const update = (i: number, patch: Partial<Holiday>) => setRows((list) => list.map((h, j) => (j === i ? { ...h, ...patch } : h)))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("publicHolidays")}</CardTitle>
        <CardDescription>{t("publicHolidaysHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((h, i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl border border-border p-2">
              <Input type="date" aria-label={t("date")} className="h-9 w-40 shrink-0" value={h.date} onChange={(e) => update(i, { date: e.target.value })} />
              <Input aria-label={t("name")} className="h-9 min-w-0 flex-1" value={h.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Button variant="ghost" size="icon-sm" aria-label={t("delete")} onClick={() => setRows((list) => list.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" size="sm" onClick={() => setRows((list) => [...list, { date: "", name: "" }])}>
            <Plus /> {t("addHoliday")}
          </Button>
        </div>
        <SaveBar onSave={() => holidays.mutate(rows)} pending={holidays.isPending} />
      </CardContent>
    </Card>
  )
}

function ListsTab({ initial }: { initial: WorkspaceSettings }) {
  const t = useTranslations()
  const { lists } = useSettingsMutations()
  const [leaveTypes, setLeaveTypes] = useState(initial.leaveTypes)
  const [categories, setCategories] = useState(initial.expenseCategories)
  const [labels, setLabels] = useState(initial.taskLabels)
  const [receiptAbove, setReceiptAbove] = useState(initial.receiptRequiredAbove)
  const { currency } = useCurrentWorkspace()

  return (
    <div className="flex flex-col gap-6">
      <DepartmentsCard />
      <HolidaysCard initial={initial.holidays} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("leaveTypes")}</CardTitle>
            <CardDescription>{t("leaveTypesHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {leaveTypes.map((l, i) => (
                <li key={l.type} className="flex items-center gap-3 px-3 py-2.5">
                  <Switch
                    checked={l.enabled}
                    aria-label={t(LEAVE_TYPE_LABEL[l.type])}
                    onChange={(on) => setLeaveTypes((list) => list.map((x, j) => (j === i ? { ...x, enabled: on } : x)))}
                  />
                  <span className="flex-1 text-sm font-medium">{t(LEAVE_TYPE_LABEL[l.type])}</span>
                  <Input
                    type="number"
                    min={0}
                    max={366}
                    className="h-9 w-20 text-right tabular-nums"
                    aria-label={t("daysPerYear")}
                    value={l.yearlyDays}
                    onChange={(e) => setLeaveTypes((list) => list.map((x, j) => (j === i ? { ...x, yearlyDays: Number(e.target.value) } : x)))}
                  />
                  <span className="w-16 text-xs text-muted-foreground">{t("daysPerYear")}</span>
                  <Input
                    type="number"
                    min={0}
                    max={l.yearlyDays}
                    disabled={l.yearlyDays === 0}
                    className="h-9 w-16 text-right tabular-nums"
                    aria-label={t("carryOverDays")}
                    value={l.carryOverMax ?? (l.type === LeaveType.VACATION ? DEFAULT_CARRY_OVER_DAYS : 0)}
                    onChange={(e) => setLeaveTypes((list) => list.map((x, j) => (j === i ? { ...x, carryOverMax: Number(e.target.value) } : x)))}
                  />
                  <span className="w-16 text-xs text-muted-foreground">{t("carryOverDays")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("expenseCategories")}</CardTitle>
            <CardDescription>{t("expenseCategoriesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {categories.map((c, i) => (
                <li key={c.category} className="flex items-center gap-3 px-3 py-2.5">
                  <Switch
                    checked={c.enabled}
                    aria-label={t(EXPENSE_CATEGORY_LABEL[c.category])}
                    onChange={(on) => setCategories((list) => list.map((x, j) => (j === i ? { ...x, enabled: on } : x)))}
                  />
                  <span className="text-sm font-medium">{t(EXPENSE_CATEGORY_LABEL[c.category])}</span>
                </li>
              ))}
            </ul>
            <Field label={t("receiptRequiredAbove", { currency })}>
              <Input type="number" min={0} className="w-32 tabular-nums" value={receiptAbove} onChange={(e) => setReceiptAbove(Number(e.target.value))} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("taskLabels")}</CardTitle>
          <CardDescription>{t("taskLabelsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {labels.map((l, i) => (
              <span key={l.id} className="flex items-center gap-1 rounded-full border border-border bg-muted ps-1">
                <Input
                  aria-label={t("labelName")}
                  value={l.name}
                  className="h-8 w-36 border-transparent bg-transparent shadow-none"
                  onChange={(e) => setLabels((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <Button variant="ghost" size="icon-xs" aria-label={t("delete")} onClick={() => setLabels((list) => list.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </span>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLabels((list) => [...list, { id: createId("lbl"), name: t("newLabel") }])}>
              <Plus /> {t("addLabel")}
            </Button>
          </div>
          <SaveBar
            pending={lists.isPending}
            onSave={() => lists.mutate({ leaveTypes, expenseCategories: categories, taskLabels: labels, receiptRequiredAbove: receiptAbove })}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ApprovalsTab({ initial }: { initial: ApprovalRule[] }) {
  const t = useTranslations()
  const { approvals } = useSettingsMutations()
  const { currency } = useCurrentWorkspace()
  const [rules, setRules] = useState(initial)
  const update = (i: number, patch: Partial<ApprovalRule>) => setRules((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("approvalWorkflows")}</CardTitle>
        <CardDescription>{t("approvalWorkflowsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {rules.map((rule, i) => {
            const usesAmount = rule.mode === ApprovalMode.TWO_STEP && AMOUNT_SUBJECTS.includes(rule.subject)
            return (
              <li key={rule.subject} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(SUBJECT_LABEL[rule.subject])}</p>
                  <p className="text-xs text-muted-foreground">{t(SUBJECT_HINT[rule.subject])}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-40">
                    <Select value={rule.mode} onValueChange={(v) => update(i, { mode: v as ApprovalMode })}>
                      <SelectTrigger aria-label={t(SUBJECT_LABEL[rule.subject])}>
                        <SelectValue>{t(MODE_LABEL[rule.mode])}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ApprovalMode).map((m) => (
                          <SelectItem key={m} value={m}>{t(MODE_LABEL[m])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {usesAmount && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t("secondStepAbove")}
                      <Input
                        type="number"
                        min={0}
                        className="h-9 w-28 tabular-nums"
                        value={rule.secondStepAbove ?? 0}
                        onChange={(e) => update(i, { secondStepAbove: Number(e.target.value) })}
                      />
                      {currency}
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">{t("selfApprovalRule")}</p>
        <SaveBar onSave={() => approvals.mutate(rules)} pending={approvals.isPending} />
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  const { data: settings, isLoading } = useWorkspaceSettings()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      {isLoading || !settings ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : (
        // Re-mount when the workspace changes so forms start from its saved values
        <div key={workspace.id}>
          <Tabs
            tabs={[
              {
                id: "company",
                label: t("company"),
                content: (
                  <div className="flex flex-col gap-6">
                    <CompanyTab initial={settings.company} />
                    <PeriodLockCard initial={settings.lockedThrough} />
                    <DataCard />
                  </div>
                ),
              },
              { id: "lists", label: t("lists"), content: <ListsTab initial={settings} /> },
              { id: "approvals", label: t("approvals"), content: <ApprovalsTab initial={settings.approvals} /> },
            ]}
          />
        </div>
      )}
    </div>
  )
}
