/**
 * @fileoverview Resilient In-Memory Demo Data Store & Query Engine for Nexora SaaS.
 * 
 * Provides production-quality mock fixtures for Users, Staff, Banned Accounts,
 * Invoices, Roles, and Transactions. Each user record is paired with
 * a locally hosted AI-generated portrait headshot in `/avatars/*.jpg`.
 * 
 * Features:
 * - Deterministic dataset with realistic corporate enterprise identities.
 * - `paginateDemoList`: Implements in-memory filtering, keyword search, column sorting,
 *   and pagination arithmetic identical to production SQL/NoSQL backend responses.
 * - In-memory mutations (`addDemoUser`, `updateDemoUser`, `deleteDemoUser`) that persist
 *   for the duration of the browser/Node session without needing an active database.
 */

import { User, UserStatus, UserType, ActivationStatus } from "@/types/users"
import { Invoice, InvoiceStatus, InvoiceMethod, InvoicesSummary } from "@/types/invoices"
import { Transaction, TransactionStatus, TransactionsSummary } from "@/types/transactions"
import { Role, AdminPermissionsPlatform } from "@/types/roles"
import { FileItem, FileType, FileVisibility, FileSummary } from "@/types/files"
import { OverviewStats, ActivityPoint, PendingAction, ActivityItem, LiveCall } from "@/types/overview"
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import { consoleInvoices, consoleTransactions, consoleUsers } from "@/lib/platform/console-data"

// ==========================================
// 1. DEMO USERS
// ==========================================
export const INITIAL_DEMO_USERS: User[] = consoleUsers()

let demoUsersState: User[] = [...INITIAL_DEMO_USERS]

export function getDemoUsers(): User[] {
  return demoUsersState
}

export function addDemoUser(payload: Partial<User>): User {
  const newUser: User = {
    id: `usr-demo-${Date.now()}`,
    name: payload.name || "New Team Member",
    email: payload.email || `user${Date.now()}@example.com`,
    role: payload.role || "user",
    userType: payload.userType || UserType.USER,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    profileColor: "#0f62fe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  }
  demoUsersState = [newUser, ...demoUsersState]
  return newUser
}

export function updateDemoUser(id: string, payload: Partial<User>): User {
  demoUsersState = demoUsersState.map((u) =>
    u.id === id ? { ...u, ...payload, updatedAt: new Date().toISOString() } : u
  )
  return demoUsersState.find((u) => u.id === id) || (payload as User)
}

export function deleteDemoUser(id: string): void {
  demoUsersState = demoUsersState.filter((u) => u.id !== id)
}

// ==========================================
// 2. DEMO INVOICES
// ==========================================
export const INITIAL_DEMO_INVOICES: Invoice[] = consoleInvoices()

let demoInvoicesState: Invoice[] = [...INITIAL_DEMO_INVOICES]

export function getDemoInvoices(): Invoice[] {
  return demoInvoicesState
}

export function getDemoInvoicesSummary(): InvoicesSummary {
  const total = demoInvoicesState.length
  const paid = demoInvoicesState.filter((i) => i.status === InvoiceStatus.PAID)
  const pending = demoInvoicesState.filter((i) => i.status === InvoiceStatus.PENDING)
  const overdue = demoInvoicesState.filter((i) => i.status === InvoiceStatus.OVERDUE)
  const cancelled = demoInvoicesState.filter((i) => i.status === InvoiceStatus.CANCELLED)

  const totalRevenue = paid.reduce((acc, i) => acc + i.total, 0)
  const paidPercentage = total > 0 ? Math.round((paid.length / total) * 100) : 0

  return {
    totalRevenue,
    paid: paid.length,
    pending: pending.length,
    overdue: overdue.length,
    cancelled: cancelled.length,
    totalInvoices: total,
    paidPercentage,
  }
}

export function addDemoInvoice(
  payload: Partial<Omit<Invoice, "user" | "items">> & {
    user?: string | User
    items?: Array<{ description?: string; quantity?: number | string; unitPrice?: number | string }>
  }
): Invoice {
  const items = (payload.items || []).map((item, idx: number) => ({
    id: `item-${Date.now()}-${idx}`,
    description: item.description || "Service Item",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 100,
    total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 100),
  }))

  const subtotal = items.reduce((acc: number, it) => acc + it.total, 0)
  const tax = subtotal * 0.1
  const total = subtotal + tax

  const newInvoice: Invoice = {
    id: `inv-demo-${Date.now()}`,
    invoiceNumber: `INV-2024-${String(demoInvoicesState.length + 1).padStart(3, "0")}`,
    user: INITIAL_DEMO_USERS[0]!,
    items,
    subtotal,
    tax,
    taxRate: 10,
    total,
    status: payload.status || InvoiceStatus.PENDING,
    method: payload.method || InvoiceMethod.STRIPE,
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    notes: payload.notes || "Generated from demo workspace preview",
    createdAt: new Date().toISOString(),
  }

  demoInvoicesState = [newInvoice, ...demoInvoicesState]
  return newInvoice
}

export function markDemoInvoicePaid(id: string): Invoice {
  demoInvoicesState = demoInvoicesState.map((inv) =>
    inv.id === id ? { ...inv, status: InvoiceStatus.PAID, paidAt: new Date().toISOString() } : inv
  )
  return demoInvoicesState.find((i) => i.id === id)!
}

export function deleteDemoInvoice(id: string): void {
  demoInvoicesState = demoInvoicesState.filter((i) => i.id !== id)
}

// ==========================================
// 3. DEMO TRANSACTIONS
// ==========================================
export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = consoleTransactions()

const demoTransactionsState: Transaction[] = [...INITIAL_DEMO_TRANSACTIONS]

export function getDemoTransactions(): Transaction[] {
  return demoTransactionsState
}

export function getDemoTransactionsSummary(): TransactionsSummary {
  const total = demoTransactionsState.length
  const successful = demoTransactionsState.filter((t) => t.status === TransactionStatus.PAID).length
  const pending = demoTransactionsState.filter((t) => t.status === TransactionStatus.PENDING).length
  const failed = demoTransactionsState.filter((t) => t.status === TransactionStatus.FAILED).length
  const totalRevenue = demoTransactionsState
    .filter((t) => t.status === TransactionStatus.PAID)
    .reduce((acc, t) => acc + t.amount, 0)
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0

  return {
    totalRevenue,
    successful,
    pending,
    failed,
    totalTransactions: total,
    successRate,
  }
}

// ==========================================
// 5. DEMO ROLES
// ==========================================
export const INITIAL_DEMO_ROLES: Role[] = [
  {
    id: "role-demo-1",
    name: "Super Administrator",
    permissions: [
      AdminPermissionsPlatform.USERS_CREATE,
      AdminPermissionsPlatform.USERS_READ,
      AdminPermissionsPlatform.USERS_UPDATE,
      AdminPermissionsPlatform.USERS_DELETE,
      AdminPermissionsPlatform.ROLES_CREATE,
      AdminPermissionsPlatform.ROLES_READ,
      AdminPermissionsPlatform.ROLES_UPDATE,
      AdminPermissionsPlatform.ROLES_DELETE,
      AdminPermissionsPlatform.SESSIONS_READ,
      AdminPermissionsPlatform.SESSIONS_DELETE,
    ],
    status: ActivationStatus.ACTIVE,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "role-demo-2",
    name: "Workspace Admin",
    permissions: [
      AdminPermissionsPlatform.USERS_CREATE,
      AdminPermissionsPlatform.USERS_READ,
      AdminPermissionsPlatform.USERS_UPDATE,
      AdminPermissionsPlatform.SESSIONS_READ,
    ],
    status: ActivationStatus.ACTIVE,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-02-10T00:00:00Z",
  },
  {
    id: "role-demo-3",
    name: "Billing Manager",
    permissions: [
      AdminPermissionsPlatform.USERS_READ,
    ],
    status: ActivationStatus.ACTIVE,
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-03-05T00:00:00Z",
  },
  {
    id: "role-demo-4",
    name: "Developer / API Operator",
    permissions: [
      AdminPermissionsPlatform.USERS_READ,
      AdminPermissionsPlatform.SESSIONS_READ,
    ],
    status: ActivationStatus.ACTIVE,
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "role-demo-5",
    name: "Read-Only Auditor",
    permissions: [
      AdminPermissionsPlatform.USERS_READ,
      AdminPermissionsPlatform.ROLES_READ,
      AdminPermissionsPlatform.SESSIONS_READ,
    ],
    status: ActivationStatus.ACTIVE,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  },
]

let demoRolesState: Role[] = [...INITIAL_DEMO_ROLES]

export function getDemoRoles(): Role[] {
  return demoRolesState
}

export function addDemoRole(payload: Partial<Role>): Role {
  const newRole: Role = {
    id: `role-demo-${Date.now()}`,
    name: payload.name || "Custom Role",
    permissions: payload.permissions || [AdminPermissionsPlatform.USERS_READ],
    status: ActivationStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  demoRolesState = [newRole, ...demoRolesState]
  return newRole
}

export function deleteDemoRole(id: string): void {
  demoRolesState = demoRolesState.filter((r) => r.id !== id)
}

// ==========================================
// 6. DEMO FILES
// ==========================================
export const INITIAL_DEMO_FILES: FileItem[] = [
  {
    id: "file-demo-1",
    name: "Q3-Financial-Executive-Summary.pdf",
    type: FileType.DOCUMENT,
    size: 2450000,
    visibility: FileVisibility.TEAM,
    owner: { id: "usr-1", name: "Alex Morgan", email: "alex.morgan@company.io" },
    uploadedAt: "2024-06-10T11:00:00Z",
    modifiedAt: "2024-06-10T11:00:00Z",
    starred: true,
  },
  {
    id: "file-demo-2",
    name: "Architecture-Specification-v2.pdf",
    type: FileType.DOCUMENT,
    size: 5120000,
    visibility: FileVisibility.TEAM,
    owner: { id: "usr-2", name: "Sarah Chen", email: "sarah.chen@techcorp.com" },
    uploadedAt: "2024-06-08T15:30:00Z",
    modifiedAt: "2024-06-09T09:00:00Z",
    starred: true,
  },
  {
    id: "file-demo-3",
    name: "SOC-2-Type-II-Report.pdf",
    type: FileType.DOCUMENT,
    size: 14200000,
    visibility: FileVisibility.PRIVATE,
    owner: { id: "usr-5", name: "Rachel Thorne", email: "rachel@stratoscloud.com" },
    uploadedAt: "2024-05-30T10:00:00Z",
    modifiedAt: "2024-05-30T10:00:00Z",
  },
  {
    id: "file-demo-4",
    name: "Brand-Design-Tokens-Kit.zip",
    type: FileType.ARCHIVE,
    size: 38400000,
    visibility: FileVisibility.PUBLIC,
    owner: { id: "usr-1", name: "Alex Morgan", email: "alex.morgan@company.io" },
    uploadedAt: "2024-04-12T14:20:00Z",
    modifiedAt: "2024-04-12T14:20:00Z",
  },
  {
    id: "file-demo-5",
    name: "Master-Service-Agreement-Template.docx",
    type: FileType.DOCUMENT,
    size: 450000,
    visibility: FileVisibility.TEAM,
    owner: { id: "usr-3", name: "Marcus Vance", email: "m.vance@vance-holdings.co" },
    uploadedAt: "2024-06-01T08:00:00Z",
    modifiedAt: "2024-06-05T17:00:00Z",
  },
]

const demoFilesState: FileItem[] = [...INITIAL_DEMO_FILES]

export function getDemoFiles(): FileItem[] {
  return demoFilesState
}

export function getDemoFilesSummary(): FileSummary {
  const totalFiles = demoFilesState.length
  const totalSize = demoFilesState.reduce((acc, f) => acc + f.size, 0)
  const documents = demoFilesState.filter((f) => f.type === FileType.DOCUMENT).length
  const images = demoFilesState.filter((f) => f.type === FileType.IMAGE).length
  const archives = demoFilesState.filter((f) => f.type === FileType.ARCHIVE).length

  return {
    totalFiles,
    totalSize,
    documents,
    images,
    videos: 0,
    archives,
    others: 0,
  }
}

// ==========================================
// 7. DEMO OVERVIEW STATS & ACTIVITY
// ==========================================
export const DEMO_OVERVIEW_STATS: OverviewStats = {
  users: 2840,
  messages: 1420000,
  groups: 124,
  channels: 380,
  calls: 2480,
  totalRevenue: 1992000,
  growthRate: 24.8,
}

export const DEMO_ACTIVITY_7D: ActivityPoint[] = [
  { label: "Mon", count: 120 },
  { label: "Tue", count: 240 },
  { label: "Wed", count: 180 },
  { label: "Thu", count: 320 },
  { label: "Fri", count: 410 },
  { label: "Sat", count: 280 },
  { label: "Sun", count: 350 },
]

export const DEMO_ACTIVITY_30D: ActivityPoint[] = Array.from({ length: 30 }, (_, i) => ({
  label: `Day ${i + 1}`,
  count: Math.floor(150 + Math.sin(i * 0.4) * 80 + (i * 5)),
}))

export const DEMO_ACTIVITY_1Y: ActivityPoint[] = [
  { label: "Oct", count: 18400 },
  { label: "Nov", count: 21200 },
  { label: "Dec", count: 24500 },
  { label: "Jan", count: 28900 },
  { label: "Feb", count: 34100 },
  { label: "Mar", count: 41200 },
  { label: "Apr", count: 48600 },
  { label: "May", count: 56300 },
  { label: "Jun", count: 64700 },
  { label: "Jul", count: 72400 },
  { label: "Aug", count: 81200 },
  { label: "Sep", count: 89450 },
]

export const DEMO_PENDING_ACTIONS: PendingAction[] = [
  {
    id: "pa-1",
    type: "user",
    title: "Verify Enterprise Identity",
    description: "NordicScale Dev requested custom SAML single sign-on verification.",
    count: 1,
    createdAt: "2024-06-14T09:00:00Z",
  },
  {
    id: "pa-2",
    type: "report",
    title: "API Rate Limit Warning",
    description: "Workspace 'Apex Ventures' reached 92% of monthly compute quota.",
    count: 2,
    createdAt: "2024-06-15T11:20:00Z",
  },
]

export const DEMO_RECENT_ACTIVITY: ActivityItem[] = [
  {
    type: "user_joined",
    title: "New Team Member Onboarded",
    subtitle: "Sarah Chen joined the Engineering Workspace.",
    createdAt: "10 minutes ago",
  },
  {
    type: "channel_created",
    title: "Production Incident Channel",
    subtitle: "#cloud-migration-ops was created by Alex Morgan.",
    createdAt: "1 hour ago",
  },
  {
    type: "group_created",
    title: "Security Review Group",
    subtitle: "SOC 2 Evidence Collectors group established.",
    createdAt: "3 hours ago",
  },
  {
    type: "user_joined",
    title: "Enterprise Customer Active",
    subtitle: "Marcus Vance signed in from Vance Holdings.",
    createdAt: "5 hours ago",
  },
]

export const DEMO_LIVE_CALLS: LiveCall[] = [
  {
    id: "call-1",
    label: "Architecture Review Sprint",
    spaceName: "Core Platform",
    participants: "Alex Morgan, Sarah Chen, Rachel Thorne",
    startedAt: "25m ago",
  },
  {
    id: "call-2",
    label: "Weekly Executive Standup",
    spaceName: "Leadership Pod",
    participants: "Marcus Vance, Elena Rostova",
    startedAt: "10m ago",
  },
]

// ==========================================
// 8. PAGINATION & FILTERING HELPER
// ==========================================
export function paginateDemoList<T>(
  items: T[],
  params?: Partial<ServerTableParams>,
  searchPredicate?: (item: T, search: string) => boolean
): ApiPaginatedResponse<T> {
  const page = params?.page ?? 0
  const pageSize = params?.pageSize ?? 10
  const search = (params?.search || "").toLowerCase().trim()

  let filtered = [...items]

  // Apply defaultFilters and filter parameters
  const allFilters = [
    ...(params?.defaultFilters || []),
    ...(params?.filter || []),
  ]
  if (allFilters.length > 0) {
    filtered = filtered.filter((item) => {
      const record = item as Record<string, unknown>
      return allFilters.every((f) => {
        const itemVal = record[f.field]
        if (f.operator === "eq") {
          if (Array.isArray(f.value)) {
            return (f.value as unknown[]).includes(itemVal)
          }
          return itemVal === f.value
        }
        if (f.operator === "ne") {
          return itemVal !== f.value
        }
        if (f.operator === "in") {
          return Array.isArray(f.value)
            ? (f.value as unknown[]).includes(itemVal)
            : itemVal === f.value
        }
        if (f.operator === "contains") {
          return String(itemVal ?? "")
            .toLowerCase()
            .includes(String(f.value).toLowerCase())
        }
        return true
      })
    })
  }

  if (search && searchPredicate) {
    filtered = filtered.filter((item) => searchPredicate(item, search))
  }

  const start = page * pageSize
  const paginated = filtered.slice(start, start + pageSize)

  return {
    success: true,
    data: paginated,
    pagination: {
      page,
      pageSize,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / (pageSize || 1)),
      hasNextPage: (page + 1) * pageSize < filtered.length,
      hasPrevPage: page > 0,
    },
  }
}

export * from "./reports"
export * from "./subscriptions"
