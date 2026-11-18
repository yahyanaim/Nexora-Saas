import axios from "axios"
import type { AdminPermissionsPlatform } from "@/types/roles"
import type { AuthUser, LoginResponse } from "@/types/auth"
import { apiClient } from "@/lib/myapi/client"
import { workspacePath } from "@/lib/myapi/realm"

/**
 * The Nexora server's sign-in answers (B1b, API contract §2 and §4.1), turned
 * into the shapes the existing screens read. The screens are unchanged: they
 * keep `AuthUser`, `LoginResponse.mfaRequired/mfaToken` and the lock screen.
 */

/** The member the server answers with: `{ id, email, name, locale }`. */
export interface ServerUser {
  id: string
  email: string
  name: string
  locale: string
}

/** `GET /auth/me` of the server. */
export interface ServerMe {
  user: ServerUser
  activeWorkspaceId: string | null
  twoFactorEnabled: boolean
}

export const isServerMe = (data: unknown): data is ServerMe =>
  !!data && typeof data === "object" && "user" in data && !!(data as { user?: { id?: unknown } }).user?.id

/** `POST /auth/login` of the server: a session, or the second step of a two-step sign-in. */
export function loginFromServer(data: unknown): LoginResponse | null {
  if (!data || typeof data !== "object") return null
  const d = data as { twoFactorRequired?: boolean; challengeId?: string; user?: ServerUser; success?: boolean }
  // An answer that already has the screens' shape (demo, older servers) passes through
  if ("success" in d) return null
  if (d.twoFactorRequired && d.challengeId) return { mfaRequired: true, mfaToken: d.challengeId }
  if (d.user?.id) return { success: true, id: d.user.id, name: d.user.name, email: d.user.email, role: "user", user: { ...d.user, role: "user" } as AuthUser }
  return null
}

interface ServerWorkspace {
  id: string
  name: string
  currency: string
  role: { key: string | null; name: string }
  isOwner: boolean
}

interface ServerContext {
  workspaceId: string
  role: { key: string | null; name: string }
  isOwner: boolean
  permissions: string[]
}

interface ServerFactor {
  enabled: boolean
  recoveryCodesLeft: number
  passcodeSet: boolean
  required: boolean
}

const codeOf = (error: unknown) => (axios.isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined)

/**
 * The signed-in member as the screens know it: the session's company (or the
 * first one), the role and permissions the server enforces there, whether a
 * second factor is still owed, and whether a lock-screen passcode is set.
 */
export async function accountFromServer(me: ServerMe): Promise<AuthUser> {
  const [{ data: workspaces }, { data: factor }] = await Promise.all([
    apiClient.get<ServerWorkspace[]>("/me/workspaces"),
    apiClient.get<ServerFactor>("/auth/2fa"),
  ])
  const chosen = workspaces.find((w) => w.id === me.activeWorkspaceId) ?? workspaces[0]
  let context: ServerContext | null = null
  let twoFactorRequired = factor.required && !factor.enabled
  if (chosen) {
    try {
      context = (await apiClient.get<ServerContext>(workspacePath(chosen.id, "/context"))).data
    } catch (error) {
      // Owners, administrators and accountants are refused company pages until they enrol (IAM-05)
      if (codeOf(error) === "err_twoFactorRequired") twoFactorRequired = true
      else throw error
    }
  }
  const isAdmin = !!(context?.isOwner || context?.role.key === "admin" || chosen?.isOwner || chosen?.role.key === "admin")
  return {
    id: me.user.id,
    name: me.user.name,
    email: me.user.email,
    role: isAdmin ? "admin" : "user",
    emailVerified: true,
    workspaceId: chosen?.id,
    permissions: (context?.permissions ?? []) as AdminPermissionsPlatform[],
    isPasscodeLocked: factor.passcodeSet,
    twoFactorEnabled: factor.enabled,
    twoFactorRequired,
  }
}

/** `POST /auth/2fa/setup` of the server answers an otpauth address; the screens show its key and a QR code. */
export function setupFromServer(data: { otpauthUrl?: string; secret?: string; qrCodeUrl?: string }): { secret: string; qrCodeUrl: string } {
  if (!data.otpauthUrl) return { secret: data.secret ?? "", qrCodeUrl: data.qrCodeUrl ?? "" }
  const secret = new URL(data.otpauthUrl).searchParams.get("secret") ?? ""
  return { secret, qrCodeUrl: data.otpauthUrl }
}
