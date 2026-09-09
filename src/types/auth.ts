import { Session } from "./sessions"
import { User } from "./users"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface VerifyOtpPayload {
  otpId: string // was email
  otpCode: string // was otp / otpCode
}

export interface VerifyAccountPayload extends VerifyOtpPayload {}

export interface SendOtpPayload {
  email: string
  typeSend: "account-verification" | "password-recovery"
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  resetToken: string
  newPassword: string
}

export interface ChangePasswordPayload {
  currentPassword: string // was oldPassword
  newPassword: string
}

export interface ChangeProfilePayload {
  name?: string
  username?: string
  avatar?: string
  cover?: string
  profileColor?: string
  bio?: string
  dateOfBirth?: string
  is2FA?: boolean
  isPasscodeLocked?: boolean
  passcodeLock?: string
  currentPassword?: string
  password?: string
}

export interface LoginResponse {
  success: boolean
  message: string
  // Direct login (active user, no 2FA)
  token?: string
  user?: User
  // OTP gate (2FA or NOT_VERIFIED account)
  otpId?: string
  email?: string
  userId?: string
}

export interface RegisterResponse {
  success: boolean
  message: string
  userId?: string
}

export interface SendOtpResponse {
  otpId?: string
  email?: string
}

export interface LogoutResponse {
  success: boolean
  message: string
}

export interface AuthMeResponse {
  success: boolean
  user: User
}

export interface VerifyTokenResponse {
  success: boolean
  user: User
}

export interface InactiveSessionAckResponse {
  success: boolean
  targetSessionId: string
  error?: string
}

export interface NewLoginAlert {
  session: Session
  receivedAt: string
}

export enum OtpPurpose {
  ACCOUNT_VERIFICATION = "account-verification",
  PASSWORD_RECOVERY = "password-recovery",
}
