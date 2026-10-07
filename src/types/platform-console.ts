/**
 * The Nexora team's console (cahier des charges "Platform Console", Phase 0 /
 * Lot A1): console roles, team members, their sessions and the audit trail.
 * None of these records hold a customer's business data.
 */

/** One role per team member (Table 4). Custom roles are not allowed (STF-04). */
export enum ConsoleRole {
  OWNER = "owner",
  ADMIN = "admin",
  SUPPORT = "support",
  FINANCE = "finance",
  ENGINEERING = "engineering",
  SALES = "sales",
  READ_ONLY = "read_only",
}

export const CONSOLE_ROLES: ConsoleRole[] = [
  ConsoleRole.OWNER,
  ConsoleRole.ADMIN,
  ConsoleRole.SUPPORT,
  ConsoleRole.FINANCE,
  ConsoleRole.ENGINEERING,
  ConsoleRole.SALES,
  ConsoleRole.READ_ONLY,
]

/** The rows of the permission matrix (Table 23). */
export enum ConsoleCapability {
  VIEW_CUSTOMERS = "view_customers",
  CREATE_TRIAL = "create_trial",
  CHANGE_STATUS = "change_status",
  SUSPEND = "suspend",
  CHANGE_PLANS = "change_plans",
  CHANGE_SUBSCRIPTION = "change_subscription",
  CREDIT_NOTES = "credit_notes",
  REFUND_SMALL = "refund_small",
  REFUND_LARGE = "refund_large",
  SUPPORT_SESSION = "support_session",
  INCIDENTS = "incidents",
  MANAGE_STAFF = "manage_staff",
  EXPORT_AUDIT = "export_audit",
  DELETE_CUSTOMER = "delete_customer",
}

/**
 * How a role holds a capability: plainly, with a fresh second factor (2FA),
 * with a second factor and a second team member (2FA + 2P), only for
 * non-owner staff ("staff"), or not at all.
 */
export type ConsoleGrant = "yes" | "2fa" | "2fa_2p" | "staff" | "no"

export type StaffStatus = "invited" | "active" | "suspended" | "removed"

export interface PlatformStaff {
  id: string
  workspaceId: string
  name: string
  email: string
  role: ConsoleRole
  status: StaffStatus
  /** Two-factor authentication set up (STF-03) */
  twoFactor: boolean
  avatar?: string
  /** ISO timestamp */
  lastSignInAt?: string
  /** ISO timestamp; invitations expire after 72 hours (STF-02) */
  inviteExpiresAt?: string
  invitedBy?: string
  createdAt: string
  updatedAt: string
}

export interface StaffSession {
  id: string
  workspaceId: string
  staffId: string
  device: string
  location: string
  ip: string
  /** ISO timestamps */
  startedAt: string
  lastActivityAt: string
  revokedAt?: string
  revokedBy?: string
  createdAt: string
  updatedAt: string
}

export type SessionState = "active" | "idle_expired" | "expired" | "revoked"

/** What a console action did, for filtering the audit trail. */
export type ConsoleAuditAction =
  | "staff.invited"
  | "staff.invite_resent"
  | "staff.role_changed"
  | "staff.removed"
  | "session.revoked"
  | "audit.exported"
  | "customer.trial_created"
  | "customer.status_changed"
  | "customer.trial_extended"
  | "customer.suspended"
  | "customer.suspension_lifted"
  | "customer.cancelled"
  | "customer.cancellation_undone"
  | "customer.reactivated"
  | "customer.note_added"
  | "user.password_reset"
  | "user.suspended"
  | "user.suspension_lifted"
  | "subscription.changed"
  | "invoice.credit_note"
  | "payment.refund"
  | "console.signed_in"

/** Append-only (AUD-01, AUD-02): no role can edit or delete an event. */
export interface ConsoleAuditEvent {
  id: string
  workspaceId: string
  actorId: string
  actorName: string
  actorRole: ConsoleRole
  action: ConsoleAuditAction
  /** Kind and label of what was acted on, e.g. "staff" / "Liam O'Connor" */
  targetType: "staff" | "session" | "customer" | "user" | "subscription" | "invoice" | "payment" | "audit" | "console"
  targetLabel: string
  customerId?: string
  before?: string
  after?: string
  ip: string
  sessionId: string
  /** ISO timestamp */
  at: string
  createdAt: string
  updatedAt: string
}
