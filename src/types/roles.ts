import {
  ShieldCheck,
  Users,
  UserX,
  Megaphone,
  MessagesSquare,
  Network,
  type LucideIcon,
} from "@/components/ui/carbon/icons"
import { SessionStatus } from "./sessions"
import { ActivationStatus } from "./users"

export interface Role {
  id: string
  name: string
  permissions: AdminPermissionsPlatform[]
  status: ActivationStatus
  createdAt: string
  updatedAt: string
}

export interface PermissionGroup {
  resource: string
  label: string
  permissions: { value: AdminPermissionsPlatform; label: string }[]
}

export interface CreateRolePayload {
  name: string
  permissions: AdminPermissionsPlatform[]
}

export type UpdateRolePayload = Partial<CreateRolePayload> & {
  status?: SessionStatus
}

export const RESOURCE_ICONS: Record<string, LucideIcon> = {
  roles: ShieldCheck,
  users: Users,
  "banned-users": UserX,
  channels: Megaphone,
  groups: MessagesSquare,
  communities: Network,
}
export enum AdminPermissionsPlatform {
  // Users
  USERS_CREATE = "users:create",
  USERS_READ = "users:read",
  USERS_UPDATE = "users:update",
  USERS_DELETE = "users:delete",

  // Roles
  ROLES_CREATE = "roles:create",
  ROLES_READ = "roles:read",
  ROLES_UPDATE = "roles:update",
  ROLES_DELETE = "roles:delete",

  // Sessions
  SESSIONS_READ = "sessions:read",
  SESSIONS_DELETE = "sessions:delete",

  // Staffs
  STAFFS_CREATE = "staffs:create",
  STAFFS_READ = "staffs:read",
  STAFFS_UPDATE = "staffs:update",
  STAFFS_DELETE = "staffs:delete",

  // Banned users
  BANNED_USERS_READ = "bannedUsers:read",
  BANNED_USERS_CREATE = "bannedUsers:create",
  BANNED_USERS_DELETE = "bannedUsers:delete",

  // System issues
  SYSTEM_ISSUES_READ = "systemIssues:read",
  SYSTEM_ISSUES_UPDATE = "systemIssues:update",
  SYSTEM_ISSUES_DELETE = "systemIssues:delete",

  // Plans
  PLANS_CREATE = "plans:create",
  PLANS_READ = "plans:read",
  PLANS_UPDATE = "plans:update",
  PLANS_DELETE = "plans:delete",

  // Subscriptions
  SUBSCRIPTIONS_CREATE = "subscriptions:create",
  SUBSCRIPTIONS_READ = "subscriptions:read",
  SUBSCRIPTIONS_UPDATE = "subscriptions:update",
  SUBSCRIPTIONS_DELETE = "subscriptions:delete",

  // Transactions
  TRANSACTIONS_CREATE = "transactions:create",
  TRANSACTIONS_READ = "transactions:read",
  TRANSACTIONS_UPDATE = "transactions:update",
  TRANSACTIONS_DELETE = "transactions:delete",

  // Invoices
  INVOICES_CREATE = "invoices:create",
  INVOICES_READ = "invoices:read",
  INVOICES_UPDATE = "invoices:update",
  INVOICES_DELETE = "invoices:delete",

  // Projects
  PROJECTS_CREATE = "projects:create",
  PROJECTS_READ = "projects:read",
  PROJECTS_UPDATE = "projects:update",
  PROJECTS_DELETE = "projects:delete",

  // Files
  FILES_CREATE = "files:create",
  FILES_READ = "files:read",
  FILES_UPDATE = "files:update",
  FILES_DELETE = "files:delete",

  // Reports
  REPORTS_READ = "reports:read",
  REPORTS_UPDATE = "reports:update",
  REPORTS_DELETE = "reports:delete",

  // Analytics
  VIEW_ANALYTICS = "analytics:view",

  // Full access (super-admin only)
  ALL = "*",
}
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    resource: "users",
    label: "Users",
    permissions: [
      { value: AdminPermissionsPlatform.USERS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.USERS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.USERS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.USERS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "roles",
    label: "Roles",
    permissions: [
      { value: AdminPermissionsPlatform.ROLES_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.ROLES_READ, label: "Read" },
      { value: AdminPermissionsPlatform.ROLES_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.ROLES_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "sessions",
    label: "Sessions",
    permissions: [
      { value: AdminPermissionsPlatform.SESSIONS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.SESSIONS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "staffs",
    label: "Staffs",
    permissions: [
      { value: AdminPermissionsPlatform.STAFFS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.STAFFS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.STAFFS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.STAFFS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "bannedUsers",
    label: "Banned Users",
    permissions: [
      { value: AdminPermissionsPlatform.BANNED_USERS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.BANNED_USERS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.BANNED_USERS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "systemIssues",
    label: "System Issues",
    permissions: [
      { value: AdminPermissionsPlatform.SYSTEM_ISSUES_READ, label: "Read" },
      { value: AdminPermissionsPlatform.SYSTEM_ISSUES_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.SYSTEM_ISSUES_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "plans",
    label: "Plans",
    permissions: [
      { value: AdminPermissionsPlatform.PLANS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.PLANS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.PLANS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.PLANS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "subscriptions",
    label: "Subscriptions",
    permissions: [
      { value: AdminPermissionsPlatform.SUBSCRIPTIONS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.SUBSCRIPTIONS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.SUBSCRIPTIONS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.SUBSCRIPTIONS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "transactions",
    label: "Transactions",
    permissions: [
      { value: AdminPermissionsPlatform.TRANSACTIONS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.TRANSACTIONS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.TRANSACTIONS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.TRANSACTIONS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "invoices",
    label: "Invoices",
    permissions: [
      { value: AdminPermissionsPlatform.INVOICES_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.INVOICES_READ, label: "Read" },
      { value: AdminPermissionsPlatform.INVOICES_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.INVOICES_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "projects",
    label: "Projects",
    permissions: [
      { value: AdminPermissionsPlatform.PROJECTS_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.PROJECTS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.PROJECTS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.PROJECTS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "files",
    label: "Files",
    permissions: [
      { value: AdminPermissionsPlatform.FILES_CREATE, label: "Create" },
      { value: AdminPermissionsPlatform.FILES_READ, label: "Read" },
      { value: AdminPermissionsPlatform.FILES_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.FILES_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "reports",
    label: "Reports",
    permissions: [
      { value: AdminPermissionsPlatform.REPORTS_READ, label: "Read" },
      { value: AdminPermissionsPlatform.REPORTS_UPDATE, label: "Update" },
      { value: AdminPermissionsPlatform.REPORTS_DELETE, label: "Delete" },
    ],
  },
  {
    resource: "analytics",
    label: "Analytics",
    permissions: [
      { value: AdminPermissionsPlatform.VIEW_ANALYTICS, label: "View" },
    ],
  },
]
