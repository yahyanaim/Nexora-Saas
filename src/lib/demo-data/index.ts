/**
 * @fileoverview Resilient In-Memory Demo Data Store & Query Engine for Nexora SaaS.
 * 
 * Provides production-quality mock fixtures for Users, Staff, Banned Accounts,
 * Invoices, Projects, Roles, and Transactions. Each user record is paired with
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
import { Transaction, TransactionStatus, TransactionMethod, TransactionsSummary } from "@/types/transactions"
import { Project, ProjectStatus, ProjectMember } from "@/types/projects"
import { Role, AdminPermissionsPlatform } from "@/types/roles"
import { FileItem, FileType, FileVisibility, FileSummary } from "@/types/files"
import { OverviewStats, ActivityPoint, PendingAction, ActivityItem, LiveCall } from "@/types/overview"
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"

// Helper owner reference for projects
const DEMO_OWNER_1 = {
  id: "usr-demo-1",
  name: "Alex Morgan",
  email: "alex.morgan@company.io",
  avatar: "/avatars/alex-morgan.jpg",
  profileColor: "#0f62fe",
}

const DEMO_OWNER_2 = {
  id: "usr-demo-2",
  name: "Sarah Chen",
  email: "sarah.chen@techcorp.com",
  avatar: "/avatars/sarah-chen.jpg",
  profileColor: "#24a148",
}

// ==========================================
// 1. DEMO USERS
// ==========================================
export const INITIAL_DEMO_USERS: User[] = [
  {
    id: "usr-demo-1",
    name: "Alex Morgan",
    email: "alex.morgan@company.io",
    role: "admin",
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/alex-morgan.jpg",
    profileColor: "#0f62fe",
    createdAt: "2024-01-15T09:30:00Z",
    updatedAt: "2024-06-10T14:20:00Z",
  },
  {
    id: "usr-demo-2",
    name: "Sarah Chen",
    email: "sarah.chen@techcorp.com",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/sarah-chen.jpg",
    profileColor: "#24a148",
    createdAt: "2024-02-01T11:15:00Z",
    updatedAt: "2024-06-12T10:05:00Z",
  },
  {
    id: "usr-demo-3",
    name: "Marcus Vance",
    email: "m.vance@vance-holdings.co",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/marcus-vance.jpg",
    profileColor: "#8a3ffc",
    createdAt: "2024-02-14T16:45:00Z",
    updatedAt: "2024-06-15T08:30:00Z",
  },
  {
    id: "usr-demo-4",
    name: "Elena Rostova",
    email: "elena.r@nordicscale.dev",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/elena-rostova.jpg",
    profileColor: "#1192e8",
    createdAt: "2024-03-05T13:00:00Z",
    updatedAt: "2024-06-14T18:00:00Z",
  },
  {
    id: "usr-demo-5",
    name: "David Kim",
    email: "dkim@apexventures.io",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.INACTIVE,
    isActive: false,
    isVerified: true,
    avatar: "/avatars/david-kim.jpg",
    profileColor: "#f1c21b",
    createdAt: "2024-03-20T10:20:00Z",
    updatedAt: "2024-05-18T12:00:00Z",
  },
  {
    id: "usr-demo-6",
    name: "Rachel Thorne",
    email: "rachel@stratoscloud.com",
    role: "admin",
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/rachel-thorne.jpg",
    profileColor: "#0072c3",
    createdAt: "2024-04-02T08:00:00Z",
    updatedAt: "2024-06-11T09:15:00Z",
  },
  {
    id: "usr-demo-7",
    name: "Liam O'Connor",
    email: "liam.oc@sentinel-ai.net",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.NOT_VERIFIED,
    isActive: true,
    isVerified: false,
    avatar: "/avatars/liam-oconnor.jpg",
    profileColor: "#6929c4",
    createdAt: "2024-05-10T15:30:00Z",
    updatedAt: "2024-05-10T15:30:00Z",
  },
  {
    id: "usr-demo-8",
    name: "Viktor Reznov",
    email: "reznov@blocked-entity.org",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.BANNED,
    isActive: false,
    isVerified: false,
    isBanned: true,
    avatar: "/avatars/viktor-reznov.jpg",
    profileColor: "#da1e28",
    createdAt: "2024-05-25T14:10:00Z",
    updatedAt: "2024-06-01T11:00:00Z",
  },
  {
    id: "usr-demo-9",
    name: "Sophia Vance",
    email: "sophia.v@nexora.io",
    role: "admin",
    userType: UserType.STAFF,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/sophia-vance.jpg",
    profileColor: "#0f62fe",
    roles: [{ id: "role-1", name: "DevOps Engineer", permissions: [] }],
    createdAt: "2024-02-10T08:30:00Z",
    updatedAt: "2024-06-15T12:00:00Z",
  },
  {
    id: "usr-demo-10",
    name: "James Wilson",
    email: "j.wilson@nexora.io",
    role: "admin",
    userType: UserType.STAFF,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/james-wilson.jpg",
    profileColor: "#1192e8",
    roles: [{ id: "role-2", name: "Security Auditor", permissions: [] }],
    createdAt: "2024-02-18T10:15:00Z",
    updatedAt: "2024-06-14T09:30:00Z",
  },
  {
    id: "usr-demo-11",
    name: "Maya Patel",
    email: "maya.p@nexora.io",
    role: "admin",
    userType: UserType.STAFF,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/maya-patel.jpg",
    profileColor: "#0072c3",
    roles: [{ id: "role-3", name: "Support Lead", permissions: [] }],
    createdAt: "2024-03-01T11:00:00Z",
    updatedAt: "2024-06-13T16:20:00Z",
  },
  {
    id: "usr-demo-12",
    name: "Lucas Dubois",
    email: "l.dubois@nexora.io",
    role: "admin",
    userType: UserType.STAFF,
    status: UserStatus.INACTIVE,
    isActive: false,
    isVerified: true,
    avatar: "/avatars/lucas-dubois.jpg",
    profileColor: "#f1c21b",
    roles: [{ id: "role-4", name: "Platform Architect", permissions: [] }],
    createdAt: "2024-03-25T14:00:00Z",
    updatedAt: "2024-05-30T10:00:00Z",
  },
  {
    id: "usr-demo-13",
    name: "Nina Rossi",
    email: "nina.r@nexora.io",
    role: "admin",
    userType: UserType.STAFF,
    status: UserStatus.ACTIVE,
    isActive: true,
    isVerified: true,
    avatar: "/avatars/rachel-thorne.jpg",
    profileColor: "#8a3ffc",
    roles: [{ id: "role-5", name: "Billing Manager", permissions: [] }],
    createdAt: "2024-04-05T09:40:00Z",
    updatedAt: "2024-06-12T13:10:00Z",
  },
  {
    id: "usr-demo-14",
    name: "Devon Miles",
    email: "devon.m@fraudulent-domain.xyz",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.BANNED,
    isActive: false,
    isVerified: false,
    isBanned: true,
    avatar: "/avatars/marcus-vance.jpg",
    profileColor: "#da1e28",
    createdAt: "2024-05-12T17:20:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
  },
  {
    id: "usr-demo-15",
    name: "Malicious Actor #402",
    email: "bot402@shadow-crawler.org",
    role: "user",
    userType: UserType.STAFF,
    status: UserStatus.BANNED,
    isActive: false,
    isVerified: false,
    isBanned: true,
    avatar: "/avatars/viktor-reznov.jpg",
    profileColor: "#da1e28",
    createdAt: "2024-05-18T22:15:00Z",
    updatedAt: "2024-06-03T11:45:00Z",
  },
  {
    id: "usr-demo-16",
    name: "Suspicious Relay",
    email: "relay-drop@temp-mail.net",
    role: "user",
    userType: UserType.USER,
    status: UserStatus.BANNED,
    isActive: false,
    isVerified: false,
    isBanned: true,
    avatar: "/avatars/david-kim.jpg",
    profileColor: "#da1e28",
    createdAt: "2024-05-28T06:50:00Z",
    updatedAt: "2024-06-04T15:30:00Z",
  },
]

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
export const INITIAL_DEMO_INVOICES: Invoice[] = [
  {
    id: "inv-demo-1",
    invoiceNumber: "INV-2024-001",
    user: INITIAL_DEMO_USERS[0]!,
    items: [
      { id: "item-1", description: "Enterprise SaaS Tier - Annual Commitment", quantity: 1, unitPrice: 3600, total: 3600 },
      { id: "item-2", description: "Dedicated Cloud Pod Provisioning", quantity: 1, unitPrice: 400, total: 400 },
    ],
    subtotal: 4000,
    tax: 400,
    taxRate: 10,
    total: 4400,
    status: InvoiceStatus.PAID,
    method: InvoiceMethod.STRIPE,
    date: "2024-06-01T00:00:00Z",
    dueDate: "2024-06-15T00:00:00Z",
    paidAt: "2024-06-02T10:14:00Z",
    notes: "Annual renewal processed via Stripe card payment.",
    createdAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "inv-demo-2",
    invoiceNumber: "INV-2024-002",
    user: INITIAL_DEMO_USERS[1]!,
    items: [
      { id: "item-3", description: "Pro Plan Subscription (Monthly)", quantity: 1, unitPrice: 199, total: 199 },
      { id: "item-4", description: "Extra Team Seats (x5)", quantity: 5, unitPrice: 20, total: 100 },
    ],
    subtotal: 299,
    tax: 29.9,
    taxRate: 10,
    total: 328.9,
    status: InvoiceStatus.PAID,
    method: InvoiceMethod.CARD,
    date: "2024-06-03T00:00:00Z",
    dueDate: "2024-06-17T00:00:00Z",
    paidAt: "2024-06-03T08:22:00Z",
    createdAt: "2024-06-03T00:00:00Z",
  },
  {
    id: "inv-demo-3",
    invoiceNumber: "INV-2024-003",
    user: INITIAL_DEMO_USERS[2]!,
    items: [
      { id: "item-5", description: "API Compute Overages (Tier 3 Usage)", quantity: 1, unitPrice: 850, total: 850 },
    ],
    subtotal: 850,
    tax: 85,
    taxRate: 10,
    total: 935,
    status: InvoiceStatus.PENDING,
    method: InvoiceMethod.BANK_TRANSFER,
    date: "2024-06-08T00:00:00Z",
    dueDate: "2024-06-22T00:00:00Z",
    notes: "Awaiting ACH transfer confirmation from finance.",
    createdAt: "2024-06-08T00:00:00Z",
  },
  {
    id: "inv-demo-4",
    invoiceNumber: "INV-2024-004",
    user: INITIAL_DEMO_USERS[3]!,
    items: [
      { id: "item-6", description: "Pro Plan Subscription (Monthly)", quantity: 1, unitPrice: 199, total: 199 },
    ],
    subtotal: 199,
    tax: 19.9,
    taxRate: 10,
    total: 218.9,
    status: InvoiceStatus.OVERDUE,
    method: InvoiceMethod.STRIPE,
    date: "2024-05-15T00:00:00Z",
    dueDate: "2024-05-29T00:00:00Z",
    notes: "Dunning notice sent. Card expired on file.",
    createdAt: "2024-05-15T00:00:00Z",
  },
  {
    id: "inv-demo-5",
    invoiceNumber: "INV-2024-005",
    user: INITIAL_DEMO_USERS[5]!,
    items: [
      { id: "item-7", description: "Enterprise Security Audit & Custom SSO", quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    subtotal: 2500,
    tax: 250,
    taxRate: 10,
    total: 2750,
    status: InvoiceStatus.PAID,
    method: InvoiceMethod.STRIPE,
    date: "2024-06-10T00:00:00Z",
    dueDate: "2024-06-24T00:00:00Z",
    paidAt: "2024-06-10T14:30:00Z",
    createdAt: "2024-06-10T00:00:00Z",
  },
  {
    id: "inv-demo-6",
    invoiceNumber: "INV-2024-006",
    user: INITIAL_DEMO_USERS[6]!,
    items: [
      { id: "item-8", description: "Starter Plan (Annual)", quantity: 1, unitPrice: 490, total: 490 },
    ],
    subtotal: 490,
    tax: 49,
    taxRate: 10,
    total: 539,
    status: InvoiceStatus.DRAFT,
    method: InvoiceMethod.CARD,
    date: "2024-06-12T00:00:00Z",
    dueDate: "2024-06-26T00:00:00Z",
    createdAt: "2024-06-12T00:00:00Z",
  },
]

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
export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-demo-1",
    transactionId: "TX-984210",
    user: { id: "usr-1", name: "Alex Morgan", email: "alex.morgan@company.io" },
    amount: 4400,
    method: TransactionMethod.STRIPE,
    status: TransactionStatus.PAID,
    date: "2024-06-02T10:14:00Z",
    description: "Annual Enterprise SaaS Plan Renewal",
    reference: "ch_3N8xKL2eZvKYlo2C0V8",
    createdAt: "2024-06-02T10:14:00Z",
  },
  {
    id: "tx-demo-2",
    transactionId: "TX-984211",
    user: { id: "usr-2", name: "Sarah Chen", email: "sarah.chen@techcorp.com" },
    amount: 328.9,
    method: TransactionMethod.CARD,
    status: TransactionStatus.PAID,
    date: "2024-06-03T08:22:00Z",
    description: "Monthly Pro Subscription + 5 User Seats",
    reference: "ch_3N8xKL2eZvKYlo2C1A4",
    createdAt: "2024-06-03T08:22:00Z",
  },
  {
    id: "tx-demo-3",
    transactionId: "TX-984212",
    user: { id: "usr-3", name: "Marcus Vance", email: "m.vance@vance-holdings.co" },
    amount: 935,
    method: TransactionMethod.BANK_TRANSFER,
    status: TransactionStatus.PENDING,
    date: "2024-06-08T00:00:00Z",
    description: "API Tier 3 Compute Overages",
    reference: "wire_ref_89042",
    createdAt: "2024-06-08T00:00:00Z",
  },
  {
    id: "tx-demo-4",
    transactionId: "TX-984213",
    user: { id: "usr-4", name: "Elena Rostova", email: "elena.r@nordicscale.dev" },
    amount: 218.9,
    method: TransactionMethod.STRIPE,
    status: TransactionStatus.FAILED,
    date: "2024-06-09T16:45:00Z",
    description: "Monthly Pro Subscription - Card Expired",
    reference: "ch_fail_3N8xKL2eZvKY",
    createdAt: "2024-06-09T16:45:00Z",
  },
  {
    id: "tx-demo-5",
    transactionId: "TX-984214",
    user: { id: "usr-5", name: "Rachel Thorne", email: "rachel@stratoscloud.com" },
    amount: 2750,
    method: TransactionMethod.STRIPE,
    status: TransactionStatus.PAID,
    date: "2024-06-10T14:30:00Z",
    description: "Enterprise Security Audit & Dedicated Pod",
    reference: "ch_3N8xKL2eZvKYlo2C2F8",
    createdAt: "2024-06-10T14:30:00Z",
  },
  {
    id: "tx-demo-6",
    transactionId: "TX-984215",
    user: { id: "usr-6", name: "Liam O'Connor", email: "liam.oc@sentinel-ai.net" },
    amount: 50,
    method: TransactionMethod.STRIPE,
    status: TransactionStatus.REFUNDED,
    date: "2024-06-11T11:10:00Z",
    description: "Partial refund for unused seats",
    reference: "re_3N8xKL2eZvKYlo2C",
    createdAt: "2024-06-11T11:10:00Z",
  },
]

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
// 4. DEMO PROJECTS
// ==========================================
export const INITIAL_DEMO_PROJECTS: Project[] = [
  {
    id: "prj-demo-1",
    name: "Cloud Infrastructure Migration",
    description: "Modernizing core Kubernetes clusters and multi-region failover pods for 99.99% uptime.",
    status: ProjectStatus.ACTIVE,
    owner: DEMO_OWNER_1,
    members: [
      { id: "m1", user: DEMO_OWNER_1, role: "OWNER" },
      { id: "m2", user: DEMO_OWNER_2, role: "MEMBER" },
    ],
    tasks: [],
    files: [],
    activities: [],
    progress: 85,
    startDate: "2024-02-01T00:00:00Z",
    endDate: "2024-07-30T00:00:00Z",
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-06-14T00:00:00Z",
  },
  {
    id: "prj-demo-2",
    name: "AI Copilot Integration",
    description: "Building automated LLM workflow assistant into customer support and ticket routing.",
    status: ProjectStatus.ACTIVE,
    owner: DEMO_OWNER_2,
    members: [
      { id: "m3", user: DEMO_OWNER_2, role: "OWNER" },
    ],
    tasks: [],
    files: [],
    activities: [],
    progress: 55,
    startDate: "2024-03-10T00:00:00Z",
    endDate: "2024-08-15T00:00:00Z",
    createdAt: "2024-03-10T00:00:00Z",
    updatedAt: "2024-06-15T00:00:00Z",
  },
  {
    id: "prj-demo-3",
    name: "SOC 2 Type II Security Compliance",
    description: "Completing annual security audit, automated penetration testing, and evidence collection.",
    status: ProjectStatus.COMPLETED,
    owner: DEMO_OWNER_1,
    members: [
      { id: "m5", user: DEMO_OWNER_1, role: "OWNER" },
    ],
    tasks: [],
    files: [],
    activities: [],
    progress: 100,
    startDate: "2024-01-10T00:00:00Z",
    endDate: "2024-05-30T00:00:00Z",
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-05-30T00:00:00Z",
  },
  {
    id: "prj-demo-4",
    name: "Mobile App V2.0 Overhaul",
    description: "Native iOS and Android client refresh using unified React Native architecture.",
    status: ProjectStatus.ACTIVE,
    owner: DEMO_OWNER_2,
    members: [
      { id: "m6", user: DEMO_OWNER_2, role: "OWNER" },
    ],
    tasks: [],
    files: [],
    activities: [],
    progress: 40,
    startDate: "2024-04-01T00:00:00Z",
    endDate: "2024-09-30T00:00:00Z",
    createdAt: "2024-04-01T00:00:00Z",
    updatedAt: "2024-06-12T00:00:00Z",
  },
  {
    id: "prj-demo-5",
    name: "Customer Analytics Engine",
    description: "Event ingestion pipeline for user behavioral funnels and automated churn alerts.",
    status: ProjectStatus.ON_HOLD,
    owner: DEMO_OWNER_1,
    members: [
      { id: "m8", user: DEMO_OWNER_1, role: "OWNER" },
    ],
    tasks: [],
    files: [],
    activities: [],
    progress: 25,
    startDate: "2024-04-20T00:00:00Z",
    endDate: "2024-10-15T00:00:00Z",
    createdAt: "2024-04-20T00:00:00Z",
    updatedAt: "2024-05-20T00:00:00Z",
  },
]

let demoProjectsState: Project[] = [...INITIAL_DEMO_PROJECTS]

export function getDemoProjects(): Project[] {
  return demoProjectsState
}

export function addDemoProject(
  payload: Partial<Omit<Project, "owner" | "members">> & {
    owner?: string | Project["owner"]
    members?: string[] | ProjectMember[]
  }
): Project {
  const newProject: Project = {
    id: `prj-demo-${Date.now()}`,
    name: payload.name || "New Workspace Project",
    description: payload.description || "Workspace initiative created via demo preview.",
    status: payload.status || ProjectStatus.ACTIVE,
    owner: DEMO_OWNER_1,
    members: [{ id: "m-owner", user: DEMO_OWNER_1, role: "OWNER" }],
    tasks: [],
    files: [],
    activities: [],
    progress: 0,
    startDate: payload.startDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  demoProjectsState = [newProject, ...demoProjectsState]
  return newProject
}

export function deleteDemoProject(id: string): void {
  demoProjectsState = demoProjectsState.filter((p) => p.id !== id)
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
  users: 1420,
  messages: 89450,
  groups: 48,
  channels: 120,
  calls: 312,
  totalRevenue: 128450,
  growthRate: 14.8,
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
