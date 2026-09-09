import { FilterItem, PaginatedResponse } from "@/types/tables"
import { AdminPermissionsPlatform } from "./roles"

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  NOT_VERIFIED = "not-verified",
  BANNED = "banned",
  DELETED = "deleted",
}
export enum ActivationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}
export enum UserType {
  ADMIN = "admin",
  STAFF = "staff",
  USER = "user",
}
export interface RoleSummary {
  id: string
  name: string
  permissions: AdminPermissionsPlatform[]
}
export interface User {
  id: string
  name: string
  username?: string
  profileColor: string
  avatar?: string
  email?: string
  userType: UserType
  status: UserStatus
  roles?: RoleSummary[]
  permissions?: AdminPermissionsPlatform[]
  lastSeen?: string
  isBanned?: boolean
  isContact?: boolean
  bio?: string
  dateOfBirth?: string
  adminTag?: string
  adminTagColor?: string
  isPasscodeLocked?: boolean
  is2FA?: boolean
  theyBlockedMe?: boolean
  privatesCount?: number
  groupsCount?: number
  channelsCount?: number
  communitiesCount?: number
  callsCount?: number
  privacy?: {
    email?: string
    lastSeen?: string
    profilePhoto?: string
    forwardedMessages?: string
    invite?: string
  }
}

export interface FetchUsersParams {
  page?: number
  pageSize?: number
  search?: string
  filter?: FilterItem[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export type ResponseUserApi = PaginatedResponse<User>
