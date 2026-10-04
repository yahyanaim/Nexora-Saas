import { AdminPermissionsPlatform } from "./roles"

/** A company using Nexora. Every record below belongs to exactly one workspace. */
export interface Workspace {
  id: string
  name: string
  /** ISO 4217 code used for rates and invoices */
  currency: string
}

/** Job-level roles inside a workspace, from most to least access. */
export enum WorkRole {
  ADMIN = "admin",
  MANAGER = "manager",
  ACCOUNTANT = "accountant",
  EMPLOYEE = "employee",
  CLIENT = "client",
}

export const WORK_ROLES = Object.values(WorkRole)

const P = AdminPermissionsPlatform

/** Default permissions granted by each work role (UI-only; the backend enforces). */
export const WORK_ROLE_PERMISSIONS: Record<WorkRole, AdminPermissionsPlatform[]> = {
  [WorkRole.ADMIN]: [P.ALL],
  [WorkRole.MANAGER]: [
    P.EMPLOYEES_READ,
    P.EMPLOYEES_UPDATE,
    P.CLIENTS_READ,
    P.CLIENTS_CREATE,
    P.CLIENTS_UPDATE,
    P.PROJECTS_READ,
    P.PROJECTS_CREATE,
    P.PROJECTS_UPDATE,
    P.FILES_READ,
    P.FILES_CREATE,
    P.TIME_TRACK,
    P.TIME_APPROVE,
    P.VIEW_ANALYTICS,
  ],
  [WorkRole.ACCOUNTANT]: [
    P.EMPLOYEES_READ,
    P.CLIENTS_READ,
    P.CLIENTS_UPDATE,
    P.INVOICES_READ,
    P.INVOICES_CREATE,
    P.INVOICES_UPDATE,
    P.TRANSACTIONS_READ,
    P.VIEW_ANALYTICS,
    P.COSTS_READ,
  ],
  [WorkRole.EMPLOYEE]: [P.PROJECTS_READ, P.FILES_READ, P.FILES_CREATE, P.TIME_TRACK],
  [WorkRole.CLIENT]: [P.PROJECTS_READ, P.INVOICES_READ],
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACTOR = "contractor",
  INTERN = "intern",
}

/** Lifecycle (HR-5). INACTIVE is a former employee: history stays, no new work. */
export enum EmployeeStatus {
  STARTING = "starting",
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
  NOTICE = "notice",
  INACTIVE = "inactive",
}

export interface Department {
  id: string
  name: string
}

export interface Employee {
  id: string
  workspaceId: string
  name: string
  email: string
  phone?: string
  jobTitle: string
  departmentId?: string
  /** Employee id of the direct manager */
  managerId?: string
  role: WorkRole
  employmentType: EmploymentType
  status: EmployeeStatus
  /** ISO date (yyyy-mm-dd) */
  hireDate: string
  /** Internal cost per hour, in the workspace currency */
  hourlyCost: number
  /** Default rate billed to clients per hour */
  billableRate: number
  /** Hours per week the employee can be planned for */
  weeklyCapacity: number
  /** Days of the week worked, 0 = Sunday; defaults to Monday–Friday (HR-4) */
  workingDays?: number[]
  /** Effective-dated rates, oldest first; hourlyCost/billableRate mirror the one in force today (HR-3, BR-4) */
  rateHistory?: RateChange[]
  skills: string[]
  createdAt: string
  updatedAt: string
}

export type EmployeeInput = Omit<Employee, "id" | "workspaceId" | "createdAt" | "updatedAt">

/** A cost and billable rate taking effect on a date. */
export interface RateChange {
  /** ISO date */
  effectiveFrom: string
  hourlyCost: number
  billableRate: number
  reason?: string
}

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]

export enum ClientStatus {
  LEAD = "lead",
  ACTIVE = "active",
  ARCHIVED = "archived",
}

export interface ClientContact {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  isPrimary: boolean
}

/**
 * An agreed hourly rate for one person or for a job title (CRM-3). Person
 * entries win over job-title entries (section 6.5).
 */
export interface RateCardEntry {
  id: string
  employeeId?: string
  jobTitle?: string
  rate: number
}

export interface Client {
  id: string
  workspaceId: string
  /** Trade name shown across the app */
  name: string
  /** Name on invoices when it differs from the trade name (CRM-1) */
  legalName?: string
  /** Morocco: 15-digit company identifier */
  ice?: string
  industry?: string
  email: string
  phone?: string
  website?: string
  address?: string
  /** Where invoices go when it differs from the address */
  billingAddress?: string
  taxId?: string
  /** Currency invoices are issued in; defaults to the workspace currency */
  currency?: string
  /** Language of invoices and emails sent to this client */
  language?: string
  status: ClientStatus
  /** Hourly rate agreed with this client; overrides employee rates when set */
  hourlyRate?: number
  rateCard?: RateCardEntry[]
  /** Days the client has to pay an invoice */
  paymentTermsDays: number
  /** Employee responsible for the relationship */
  accountManagerId?: string
  contacts: ClientContact[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ClientInput = Omit<Client, "id" | "workspaceId" | "createdAt" | "updatedAt">
