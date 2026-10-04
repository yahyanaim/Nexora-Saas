import type { AdminPermissionsPlatform } from "./roles"
import { User, UserRole } from "./users"
import { Session } from "./sessions"

export type { UserRole }

export interface NewLoginAlert {
  session: Session
  receivedAt: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  emailVerified?: boolean
  orgId?: string
  avatar?: string | null
  profileColor?: string
  isPasscodeLocked?: boolean
  /** Member of the Nexora platform team: sees the platform console (plans, subscriptions, all users) */
  platformOperator?: boolean
  /** Signed in through an employee account: the company and employee it belongs to */
  workspaceId?: string
  employeeId?: string
  /** Rights from the employee's work role */
  permissions?: AdminPermissionsPlatform[]
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  id: string
  name: string
  email: string
  role: UserRole
  emailVerified?: boolean
  orgId?: string
  avatar?: string | null
  profileColor?: string
  mfaRequired?: boolean
  mfaToken?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  confirmPassword?: string
}

export interface VerifyOtpPayload {
  token: string
}

export type VerifyAccountPayload = VerifyOtpPayload

export interface SendOtpPayload {
  email: string
  typeSend?: "account-verification" | "password-recovery"
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  newPassword: string
  confirmNewPassword?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface ChangeProfilePayload {
  name?: string
  email?: string
  username?: string
  avatar?: string
  cover?: string
  profileColor?: string
  bio?: string
  dateOfBirth?: string
  passcodeLock?: string
  isPasscodeLocked?: boolean
  is2FA?: boolean
}

export interface InviteAcceptPayload {
  token: string
  password: string
  confirmPassword: string
  name?: string
}

export interface TwoFactorVerifyPayload {
  mfaToken: string
  code: string
}

export interface LoginResponse {
  success?: boolean
  message?: string
  id?: string
  name?: string
  email?: string
  role?: UserRole
  emailVerified?: boolean
  orgId?: string
  mfaRequired?: boolean
  mfaToken?: string
  user?: User | AuthUser
  token?: string
}

export interface RegisterResponse {
  id?: string
  name?: string
  email?: string
  role?: UserRole
  message?: string
  success?: boolean
  user?: User | AuthUser
}

export interface SendOtpResponse {
  message?: string
}

export interface LogoutResponse {
  message?: string
}

export interface AuthMeResponse {
  id: string
  name: string
  email: string
  role: UserRole
  emailVerified?: boolean
  orgId?: string
}

export enum OtpPurpose {
  ACCOUNT_VERIFICATION = "account-verification",
  PASSWORD_RECOVERY = "password-recovery",
}
