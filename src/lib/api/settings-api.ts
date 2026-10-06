import { ACCOUNT_PATTERN, DEFAULT_ACCOUNTS } from "@/lib/workforce/journal"
import { assertCompanyIds, cleanId, isMoroccan } from "@/lib/workforce/tax-ids"
import type { ReminderSettings } from "@/types/work-crm"
import type { AccountKey, CustomFieldDef, KpiSettings, OverheadItem } from "@/types/work-settings"
import { validateFieldDefs } from "@/lib/workforce/custom-fields"
import { ExpenseCategory } from "@/types/work-costs"
import { LeaveType } from "@/types/work-planning"
import type { Department } from "@/types/workforce"
import {
  AMOUNT_SUBJECTS,
  ApprovalMode,
  ApprovalSubject,
  type ApprovalRule,
  type CompanySettings,
  type Holiday,
  type WorkspaceSettings,
} from "@/types/work-settings"
import { createId, readCollection, readDocument, writeCollection, writeDocument } from "@/lib/workforce/demo-store"
import { seedDepartments } from "@/lib/workforce/demo-seed"
import { ANNUAL_VACATION_DAYS, DEFAULT_CARRY_OVER_DAYS } from "@/types/work-planning"
import { recordAudit } from "@/lib/workforce/audit"

const COMPANIES: Record<string, CompanySettings> = {
  ws_atlas: {
    legalName: "Atlas Consulting SARL",
    tradeName: "Atlas Consulting",
    ice: "002847192000084",
    taxId: "40182934",
    tradeRegister: "Casablanca 148291",
    patente: "34172859",
    cnssNumber: "4827193",
    address: "12 Boulevard d'Anfa",
    city: "Casablanca",
    country: "MA",
    baseCurrency: "EUR",
    fiscalYearStartMonth: 1,
    weekStart: "monday",
    timeZone: "Africa/Casablanca",
    invoiceNumberFormat: "INV-{YYYY}-{SEQ}",
    quoteNumberFormat: "DEV-{YYYY}-{SEQ}",
    documentStyle: "classic",
    phone: "+212 522 00 00 00",
    email: "billing@atlas.example",
    website: "atlas-consulting.example",
    shareCapital: "100 000 MAD",
    bankName: "Attijariwafa Bank",
    bankAccount: "007 780 0001234567890123 45",
    bankSwift: "BCMAMAMC",
    invoiceFooter: "Payment by bank transfer quoting the invoice number. Late payments bear interest at the legal rate.",
    brandColor: "#2684ff",
  },
  ws_northwind: {
    legalName: "Northwind Studio LLC",
    tradeName: "Northwind Studio",
    taxId: "84-1928374",
    address: "220 Market Street",
    city: "San Francisco",
    country: "US",
    baseCurrency: "USD",
    fiscalYearStartMonth: 1,
    weekStart: "monday",
    timeZone: "America/Los_Angeles",
    invoiceNumberFormat: "NW-{YYYY}-{SEQ}",
    quoteNumberFormat: "NWQ-{YYYY}-{SEQ}",
    documentStyle: "modern",
    phone: "+1 415 555 0142",
    email: "accounts@northwind.example",
    website: "northwind.example",
    bankName: "First Republic Bank",
    bankAccount: "IBAN US00 0000 0000 1234 5678",
    bankSwift: "FRBBUS6S",
    invoiceFooter: "Thank you for your business. Payment due within the agreed terms.",
    brandColor: "#2684ff",
  },
}

/** 2026 public holidays. Religious dates follow the moon and are estimates to confirm each year. */
const HOLIDAYS: Record<string, Holiday[]> = {
  ws_atlas: [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-11", name: "Independence Manifesto Day" },
    { date: "2026-01-14", name: "Amazigh New Year" },
    { date: "2026-03-20", name: "Eid al-Fitr" },
    { date: "2026-03-21", name: "Eid al-Fitr (day 2)" },
    { date: "2026-05-01", name: "Labour Day" },
    { date: "2026-05-27", name: "Eid al-Adha" },
    { date: "2026-05-28", name: "Eid al-Adha (day 2)" },
    { date: "2026-06-16", name: "Islamic New Year" },
    { date: "2026-07-30", name: "Throne Day" },
    { date: "2026-08-14", name: "Oued Ed-Dahab Day" },
    { date: "2026-08-20", name: "Revolution of the King and the People" },
    { date: "2026-08-21", name: "Youth Day" },
    { date: "2026-08-25", name: "Mawlid" },
    { date: "2026-11-06", name: "Green March" },
    { date: "2026-11-18", name: "Independence Day" },
  ],
  ws_northwind: [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
    { date: "2026-02-16", name: "Presidents' Day" },
    { date: "2026-05-25", name: "Memorial Day" },
    { date: "2026-06-19", name: "Juneteenth" },
    { date: "2026-07-03", name: "Independence Day (observed)" },
    { date: "2026-09-07", name: "Labor Day" },
    { date: "2026-11-11", name: "Veterans Day" },
    { date: "2026-11-26", name: "Thanksgiving" },
    { date: "2026-12-25", name: "Christmas Day" },
  ],
}

/** Section 8.3 defaults: managers approve time, leave and expenses; accountants issue invoices. */
export const DEFAULT_APPROVALS: ApprovalRule[] = [
  { subject: ApprovalSubject.TIMESHEET, mode: ApprovalMode.ONE_STEP },
  { subject: ApprovalSubject.LEAVE, mode: ApprovalMode.ONE_STEP },
  { subject: ApprovalSubject.EXPENSE, mode: ApprovalMode.TWO_STEP, secondStepAbove: 500 },
  { subject: ApprovalSubject.QUOTE, mode: ApprovalMode.NONE },
  { subject: ApprovalSubject.INVOICE, mode: ApprovalMode.ONE_STEP },
]

const LEAVE_DAYS: Record<LeaveType, number> = {
  [LeaveType.VACATION]: ANNUAL_VACATION_DAYS,
  [LeaveType.SICK]: 0,
  [LeaveType.PERSONAL]: 3,
  [LeaveType.UNPAID]: 0,
}

export function seedSettings(workspaceId: string): WorkspaceSettings {
  return {
    company: COMPANIES[workspaceId] ?? {
      legalName: "My company",
      country: "MA",
      baseCurrency: "MAD",
      fiscalYearStartMonth: 1,
      weekStart: "monday",
      timeZone: "Africa/Casablanca",
      invoiceNumberFormat: "INV-{YYYY}-{SEQ}",
      quoteNumberFormat: "DEV-{YYYY}-{SEQ}",
      documentStyle: "classic",
    },
    approvals: DEFAULT_APPROVALS,
    leaveTypes: Object.values(LeaveType).map((type) => ({ type, enabled: true, yearlyDays: LEAVE_DAYS[type], carryOverMax: type === LeaveType.VACATION ? DEFAULT_CARRY_OVER_DAYS : 0 })),
    expenseCategories: Object.values(ExpenseCategory).map((category) => ({ category, enabled: true })),
    taskLabels: [
      { id: "lbl_bug", name: "Bug" },
      { id: "lbl_feature", name: "Feature" },
      { id: "lbl_design", name: "Design" },
      { id: "lbl_client", name: "Client request" },
    ],
    receiptRequiredAbove: 25,
    holidays: HOLIDAYS[workspaceId] ?? [],
    ownerEmployeeId: OWNER_EMPLOYEES[workspaceId],
  }
}

/** In the demo, the owner account (Alex) is linked to each workspace's managing director. */
const OWNER_EMPLOYEES: Record<string, string> = { ws_atlas: "emp_sara", ws_northwind: "emp_ava" }

const read = (workspaceId: string) => readDocument("settings", workspaceId, () => seedSettings(workspaceId))
const write = (workspaceId: string, value: WorkspaceSettings) => writeDocument("settings", workspaceId, value)

export async function getSettingsApi(workspaceId: string): Promise<WorkspaceSettings> {
  const stored = read(workspaceId)
  // Demo workspaces saved before the owner link existed get the seeded one; null means "not linked" on purpose
  const settings = stored.ownerEmployeeId === undefined && OWNER_EMPLOYEES[workspaceId] ? { ...stored, ownerEmployeeId: OWNER_EMPLOYEES[workspaceId] } : stored
  // Demo workspaces saved before the payment fields existed pick them up from the seed
  const seed = COMPANIES[workspaceId]
  if (!seed) return settings
  const company = { ...settings.company }
  for (const key of Object.keys(seed) as (keyof CompanySettings)[]) {
    if (company[key] === undefined) (company as Record<string, unknown>)[key] = seed[key]
  }
  return { ...settings, company }
}

/** Validates and saves the company identity (PLT-3). */
export async function updateCompanyApi(workspaceId: string, input: CompanySettings): Promise<WorkspaceSettings> {
  const company = { ...input, ice: cleanId(input.ice), patente: cleanId(input.patente), cnssNumber: cleanId(input.cnssNumber) }
  if (isMoroccan(company.country)) company.taxId = cleanId(company.taxId)
  if (!company.legalName.trim()) throw new Error("Enter the company's legal name")
  assertCompanyIds(company)
  if (!/^[A-Z]{3}$/.test(company.baseCurrency)) throw new Error("Pick a base currency")
  if (company.fiscalYearStartMonth < 1 || company.fiscalYearStartMonth > 12) throw new Error("Pick the first month of the fiscal year")
  if (!company.invoiceNumberFormat.includes("{SEQ}")) throw new Error("The invoice number format must contain {SEQ}")
  if (company.quoteNumberFormat && !company.quoteNumberFormat.includes("{SEQ}")) throw new Error("The quote number format must contain {SEQ}")
  if (company.logoDataUrl && (!/^data:image\/(png|jpeg);base64,/.test(company.logoDataUrl) || company.logoDataUrl.length > 400_000)) throw new Error("The logo must be a PNG or JPEG under 300 KB")
  if (company.brandColor && !/^#[0-9a-fA-F]{6}$/.test(company.brandColor)) throw new Error("The brand colour must look like #2563eb")
  if (company.email && !/^\S+@\S+\.\S+$/.test(company.email)) throw new Error("Enter a valid billing email")
  const next = { ...read(workspaceId), company: { ...company, legalName: company.legalName.trim() } }
  recordAudit(workspaceId, { action: "Company details updated", actionKey: "settings.company", category: "Settings", target: "Workspace settings" })
  write(workspaceId, next)
  return next
}

/** Saves approval rules; amounts only apply to two-step rules on money subjects. */
export async function updateApprovalsApi(workspaceId: string, approvals: ApprovalRule[]): Promise<WorkspaceSettings> {
  const cleaned = approvals.map((rule) => {
    const usesAmount = rule.mode === ApprovalMode.TWO_STEP && AMOUNT_SUBJECTS.includes(rule.subject)
    if (usesAmount && rule.secondStepAbove !== undefined && rule.secondStepAbove < 0) {
      throw new Error("Amounts can't be negative")
    }
    return { subject: rule.subject, mode: rule.mode, secondStepAbove: usesAmount ? rule.secondStepAbove : undefined }
  })
  const next = { ...read(workspaceId), approvals: cleaned }
  recordAudit(workspaceId, { action: "Approval rules updated", actionKey: "settings.approvals", category: "Settings", target: "Workspace settings" })
  write(workspaceId, next)
  return next
}

type ListsInput = Pick<WorkspaceSettings, "leaveTypes" | "expenseCategories" | "taskLabels" | "receiptRequiredAbove">

/** Saves the configurable lists (PLT-6). At least one leave type and one category stay on. */
export async function updateListsApi(workspaceId: string, lists: ListsInput): Promise<WorkspaceSettings> {
  if (!lists.leaveTypes.some((l) => l.enabled)) throw new Error("Keep at least one leave type")
  if (!lists.expenseCategories.some((c) => c.enabled)) throw new Error("Keep at least one expense category")
  if (lists.leaveTypes.some((l) => l.yearlyDays < 0 || l.yearlyDays > 366)) throw new Error("Yearly days must be between 0 and 366")
  if (lists.leaveTypes.some((l) => (l.carryOverMax ?? 0) < 0 || (l.carryOverMax ?? 0) > l.yearlyDays)) throw new Error("Carry-over must be between 0 and the yearly days")
  if (lists.receiptRequiredAbove < 0) throw new Error("Amounts can't be negative")
  const names = lists.taskLabels.map((l) => l.name.trim().toLowerCase())
  if (names.some((n) => !n)) throw new Error("Labels need a name")
  if (new Set(names).size !== names.length) throw new Error("Two labels have the same name")
  const next = {
    ...read(workspaceId),
    ...lists,
    taskLabels: lists.taskLabels.map((l) => ({ ...l, name: l.name.trim() })),
  }
  recordAudit(workspaceId, { action: "Lists updated", actionKey: "settings.lists", category: "Settings", target: "Workspace settings" })
  write(workspaceId, next)
  return next
}

/** Saves when overdue reminders go out (BIL-15): three increasing day counts. */
export async function updateRemindersApi(workspaceId: string, reminders: ReminderSettings): Promise<WorkspaceSettings> {
  const [a, b, c] = reminders.days
  if (![a, b, c].every((d) => Number.isInteger(d) && d >= 1 && d <= 365) || !(a < b && b < c)) {
    throw new Error("Reminder days must be whole numbers that increase, from 1 to 365")
  }
  recordAudit(workspaceId, { action: "Payment reminders updated", actionKey: "settings.reminders", category: "Settings", target: "Workspace settings" })
  const next = { ...read(workspaceId), reminders }
  write(workspaceId, next)
  return next
}

/** Saves KPI targets and who may see individual KPIs (KPI-6, KPI-11). */
export async function updateKpiSettingsApi(workspaceId: string, kpi: KpiSettings): Promise<WorkspaceSettings> {
  if (Object.values(kpi.targets).some((v) => !(v >= 0))) throw new Error("Targets can't be negative")
  if (["utilization", "onTime", "estimateAccuracy"].some((k) => kpi.targets[k as keyof KpiSettings["targets"]] > 200)) throw new Error("Rate targets must be 200% or less")
  recordAudit(workspaceId, { action: "KPI targets updated", actionKey: "settings.kpi", category: "Settings", target: "KPI targets and visibility" })
  const next = { ...read(workspaceId), kpi }
  write(workspaceId, next)
  return next
}

/** Links the owner's account to an employee record, or unlinks it with null. */
export async function updateOwnerEmployeeApi(workspaceId: string, employeeId: string | null): Promise<WorkspaceSettings> {
  recordAudit(workspaceId, { action: "Owner's employee profile changed", actionKey: "settings.owner_employee", category: "Settings", target: "Workspace owner" })
  // An empty string keeps "unlinked" distinct from "never set"
  const next = { ...read(workspaceId), ownerEmployeeId: employeeId ?? "" }
  write(workspaceId, next)
  return next
}

/** Monthly overhead lines (CST-4). */
export async function updateOverheadsApi(workspaceId: string, overheads: OverheadItem[]): Promise<WorkspaceSettings> {
  const rows = overheads.map((o) => ({ ...o, name: o.name.trim() })).filter((o) => o.name || o.monthlyAmount)
  if (rows.some((o) => !o.name)) throw new Error("Every overhead line needs a name")
  if (rows.some((o) => !(o.monthlyAmount >= 0))) throw new Error("Amounts can't be negative")
  recordAudit(workspaceId, { action: "Overheads updated", actionKey: "settings.overheads", category: "Settings", target: "Overhead costs" })
  const next = { ...read(workspaceId), overheads: rows }
  write(workspaceId, next)
  return next
}

/** Account numbers for the accounting journal export (Phase 6e.4); blank keeps the CGNC default. */
export async function updateAccountsApi(workspaceId: string, accounts: Partial<Record<AccountKey, string>>): Promise<WorkspaceSettings> {
  const clean = Object.fromEntries(
    Object.entries(accounts)
      .map(([k, v]) => [k, (v ?? "").trim()])
      .filter(([k, v]) => v && v !== DEFAULT_ACCOUNTS[k as AccountKey])
  ) as Partial<Record<AccountKey, string>>
  if (Object.values(clean).some((v) => !ACCOUNT_PATTERN.test(v!))) throw new Error("Account numbers have 4 to 8 digits")
  recordAudit(workspaceId, { action: "Accounting accounts updated", actionKey: "settings.accounts", category: "Settings", target: "Accounting" })
  const next = { ...read(workspaceId), accounts: clean }
  write(workspaceId, next)
  return next
}

/** Custom fields on clients, projects and employees (PLT-12). Values of removed fields stay on records but are no longer shown. */
export async function updateCustomFieldsApi(workspaceId: string, customFields: CustomFieldDef[]): Promise<WorkspaceSettings> {
  const defs = customFields.map((d) => ({
    ...d,
    label: d.label.trim(),
    options: d.type === "select" ? (d.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
  }))
  validateFieldDefs(defs)
  recordAudit(workspaceId, { action: "Custom fields updated", actionKey: "settings.custom_fields", category: "Settings", target: "Custom fields" })
  const next = { ...read(workspaceId), customFields: defs }
  write(workspaceId, next)
  return next
}

/** Locks every record dated on or before a day (BR-7); null unlocks. */
export async function updatePeriodLockApi(workspaceId: string, lockedThrough: string | null): Promise<WorkspaceSettings> {
  if (lockedThrough && !/^\d{4}-\d{2}-\d{2}$/.test(lockedThrough)) throw new Error("Pick a date")
  recordAudit(workspaceId, {
    action: lockedThrough ? "Period locked" : "Period unlocked",
    actionKey: "settings.period_lock",
    category: "Settings",
    target: "Accounting period",
    before: read(workspaceId).lockedThrough,
    after: lockedThrough ?? undefined,
  })
  const next = { ...read(workspaceId), lockedThrough: lockedThrough ?? undefined }
  write(workspaceId, next)
  return next
}

/** Throws when a date falls inside the locked period (BR-7). */
export async function assertPeriodOpen(workspaceId: string, date: string) {
  const { lockedThrough } = read(workspaceId)
  if (lockedThrough && date <= lockedThrough) {
    throw new Error(`The period up to ${lockedThrough} is locked`)
  }
}

/** Saves the holiday calendar; one holiday per date. */
export async function updateHolidaysApi(workspaceId: string, holidays: Holiday[]): Promise<WorkspaceSettings> {
  const cleaned = holidays
    .map((h) => ({ date: h.date, name: h.name.trim() }))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (cleaned.some((h) => !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || !h.name)) throw new Error("Each holiday needs a date and a name")
  if (new Set(cleaned.map((h) => h.date)).size !== cleaned.length) throw new Error("Two holidays are on the same date")
  const next = { ...read(workspaceId), holidays: cleaned }
  recordAudit(workspaceId, { action: "Holidays updated", actionKey: "settings.holidays", category: "Settings", target: "Workspace settings" })
  write(workspaceId, next)
  return next
}

// Departments --------------------------------------------------------------

const readDepartments = (workspaceId: string) =>
  readCollection<Department>("departments", workspaceId, () => seedDepartments(workspaceId))

export async function listDepartmentsApi(workspaceId: string): Promise<Department[]> {
  return readDepartments(workspaceId)
}

function assertUniqueName(workspaceId: string, name: string, exceptId?: string) {
  const clean = name.trim()
  if (!clean) throw new Error("Enter a department name")
  if (readDepartments(workspaceId).some((d) => d.id !== exceptId && d.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error("A department with this name already exists")
  }
  return clean
}

export async function createDepartmentApi(workspaceId: string, name: string): Promise<Department> {
  const department = { id: createId("dep"), name: assertUniqueName(workspaceId, name) }
  writeCollection("departments", workspaceId, [...readDepartments(workspaceId), department])
  return department
}

export async function renameDepartmentApi(workspaceId: string, id: string, name: string): Promise<Department> {
  const clean = assertUniqueName(workspaceId, name, id)
  const list = readDepartments(workspaceId).map((d) => (d.id === id ? { ...d, name: clean } : d))
  writeCollection("departments", workspaceId, list)
  return list.find((d) => d.id === id)!
}

/** A department that still has people can't be removed. */
export async function deleteDepartmentApi(workspaceId: string, id: string, employeeDepartmentIds: (string | undefined)[]) {
  if (employeeDepartmentIds.includes(id)) throw new Error("Move its people to another department first")
  writeCollection("departments", workspaceId, readDepartments(workspaceId).filter((d) => d.id !== id))
}
