import { ExpenseCategory } from "@/types/work-costs"
import { LeaveType } from "@/types/work-planning"
import type { Department } from "@/types/workforce"
import {
  AMOUNT_SUBJECTS,
  ApprovalMode,
  ApprovalSubject,
  type ApprovalRule,
  type CompanySettings,
  type WorkspaceSettings,
} from "@/types/work-settings"
import { createId, readCollection, readDocument, writeCollection, writeDocument } from "@/lib/workforce/demo-store"
import { seedDepartments } from "@/lib/workforce/demo-seed"
import { ANNUAL_VACATION_DAYS } from "@/types/work-planning"

const COMPANIES: Record<string, CompanySettings> = {
  ws_atlas: {
    legalName: "Atlas Consulting SARL",
    tradeName: "Atlas Consulting",
    ice: "002847192000084",
    taxId: "40182934",
    tradeRegister: "Casablanca 148291",
    address: "12 Boulevard d'Anfa",
    city: "Casablanca",
    country: "MA",
    baseCurrency: "EUR",
    fiscalYearStartMonth: 1,
    weekStart: "monday",
    timeZone: "Africa/Casablanca",
    invoiceNumberFormat: "INV-{YYYY}-{SEQ}",
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
  },
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
    },
    approvals: DEFAULT_APPROVALS,
    leaveTypes: Object.values(LeaveType).map((type) => ({ type, enabled: true, yearlyDays: LEAVE_DAYS[type] })),
    expenseCategories: Object.values(ExpenseCategory).map((category) => ({ category, enabled: true })),
    taskLabels: [
      { id: "lbl_bug", name: "Bug" },
      { id: "lbl_feature", name: "Feature" },
      { id: "lbl_design", name: "Design" },
      { id: "lbl_client", name: "Client request" },
    ],
    receiptRequiredAbove: 25,
  }
}

const read = (workspaceId: string) => readDocument("settings", workspaceId, () => seedSettings(workspaceId))
const write = (workspaceId: string, value: WorkspaceSettings) => writeDocument("settings", workspaceId, value)

export async function getSettingsApi(workspaceId: string): Promise<WorkspaceSettings> {
  return read(workspaceId)
}

const ICE = /^\d{15}$/

/** Validates and saves the company identity (PLT-3). */
export async function updateCompanyApi(workspaceId: string, company: CompanySettings): Promise<WorkspaceSettings> {
  if (!company.legalName.trim()) throw new Error("Enter the company's legal name")
  if (company.ice && !ICE.test(company.ice)) throw new Error("The ICE must have exactly 15 digits")
  if (!/^[A-Z]{3}$/.test(company.baseCurrency)) throw new Error("Pick a base currency")
  if (company.fiscalYearStartMonth < 1 || company.fiscalYearStartMonth > 12) throw new Error("Pick the first month of the fiscal year")
  if (!company.invoiceNumberFormat.includes("{SEQ}")) throw new Error("The invoice number format must contain {SEQ}")
  const next = { ...read(workspaceId), company: { ...company, legalName: company.legalName.trim() } }
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
  write(workspaceId, next)
  return next
}

type ListsInput = Pick<WorkspaceSettings, "leaveTypes" | "expenseCategories" | "taskLabels" | "receiptRequiredAbove">

/** Saves the configurable lists (PLT-6). At least one leave type and one category stay on. */
export async function updateListsApi(workspaceId: string, lists: ListsInput): Promise<WorkspaceSettings> {
  if (!lists.leaveTypes.some((l) => l.enabled)) throw new Error("Keep at least one leave type")
  if (!lists.expenseCategories.some((c) => c.enabled)) throw new Error("Keep at least one expense category")
  if (lists.leaveTypes.some((l) => l.yearlyDays < 0 || l.yearlyDays > 366)) throw new Error("Yearly days must be between 0 and 366")
  if (lists.receiptRequiredAbove < 0) throw new Error("Amounts can't be negative")
  const names = lists.taskLabels.map((l) => l.name.trim().toLowerCase())
  if (names.some((n) => !n)) throw new Error("Labels need a name")
  if (new Set(names).size !== names.length) throw new Error("Two labels have the same name")
  const next = {
    ...read(workspaceId),
    ...lists,
    taskLabels: lists.taskLabels.map((l) => ({ ...l, name: l.name.trim() })),
  }
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
