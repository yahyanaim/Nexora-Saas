import { User } from "./users"

export interface SessionLocation {
  country?: string
  city?: string
  lat?: number
  lon?: number
}

export enum SessionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  INACTIVE = "inactive",
}

export interface SessionLocation {
  country?: string
  city?: string
  lat?: number
  lon?: number
}

export interface Session {
  id: string
  user: User
  ip: string
  userAgent: string
  location?: SessionLocation
  status: SessionStatus
  expiresIn?: string | Date
  lastUsedAt?: string | Date
  createdAt?: string | Date
  updatedAt?: string | Date
  isCurrent?: boolean
}
