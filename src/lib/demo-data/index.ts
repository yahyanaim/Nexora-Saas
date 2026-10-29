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

import { User, UserStatus, UserType } from "@/types/users"
import { FileItem, FileType, FileVisibility, FileSummary } from "@/types/files"
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import { consoleUsers } from "@/lib/platform/console-data"

// ==========================================
// 1. DEMO USERS
// ==========================================
export const INITIAL_DEMO_USERS: User[] = consoleUsers()

let demoUsersState: User[] = [...INITIAL_DEMO_USERS]

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
