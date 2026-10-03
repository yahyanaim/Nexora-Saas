import {
  ClientStatus,
  EmployeeStatus,
  EmploymentType,
  WorkRole,
} from "@/types/workforce"

/** Translation keys for workforce enums, so every screen labels them the same way. */
export const WORK_ROLE_LABEL: Record<WorkRole, string> = {
  [WorkRole.ADMIN]: "workRoleAdmin",
  [WorkRole.MANAGER]: "workRoleManager",
  [WorkRole.ACCOUNTANT]: "workRoleAccountant",
  [WorkRole.EMPLOYEE]: "workRoleEmployee",
  [WorkRole.CLIENT]: "workRoleClient",
}

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: "fullTime",
  [EmploymentType.PART_TIME]: "partTime",
  [EmploymentType.CONTRACTOR]: "contractor",
  [EmploymentType.INTERN]: "intern",
}

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "active",
  [EmployeeStatus.ON_LEAVE]: "onLeave",
  [EmployeeStatus.INACTIVE]: "inactive",
}

export const EMPLOYEE_STATUS_CLASS: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "bg-success-soft text-success-foreground border-transparent",
  [EmployeeStatus.ON_LEAVE]: "bg-warning-soft text-warning-foreground border-transparent",
  [EmployeeStatus.INACTIVE]: "bg-muted text-muted-foreground border-transparent",
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  [ClientStatus.LEAD]: "lead",
  [ClientStatus.ACTIVE]: "active",
  [ClientStatus.ARCHIVED]: "archived",
}

export const CLIENT_STATUS_CLASS: Record<ClientStatus, string> = {
  [ClientStatus.LEAD]: "bg-info-soft text-info-foreground border-transparent",
  [ClientStatus.ACTIVE]: "bg-success-soft text-success-foreground border-transparent",
  [ClientStatus.ARCHIVED]: "bg-muted text-muted-foreground border-transparent",
}

export function formatMoney(amount: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Faceted-filter match for columns whose filter value is a list of options. */
export function includesFilter(value: unknown, selected: unknown) {
  return Array.isArray(selected) && selected.length > 0 ? selected.includes(value) : true
}

/** Select value standing for "none", since Radix Select can't hold "". */
export const NONE = "__none__"
