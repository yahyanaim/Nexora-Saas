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
  ],
  [WorkRole.EMPLOYEE]: [P.PROJECTS_READ, P.FILES_READ, P.FILES_CREATE],
  [WorkRole.CLIENT]: [P.PROJECTS_READ, P.INVOICES_READ],
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACTOR = "contractor",
  INTERN = "intern",
}

export enum EmployeeStatus {
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
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
  skills: string[]
  createdAt: string
  updatedAt: string
}

export type EmployeeInput = Omit<Employee, "id" | "workspaceId" | "createdAt" | "updatedAt">

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

export interface Client {
  id: string
  workspaceId: string
  name: string
  industry?: string
  email: string
  phone?: string
  website?: string
  address?: string
  taxId?: string
  status: ClientStatus
  /** Hourly rate agreed with this client; overrides employee rates when set */
  hourlyRate?: number
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
