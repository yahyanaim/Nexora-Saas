import { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"
import { apiClient } from "./client"
import { accountFromServer, isServerMe, loginFromServer, setupFromServer } from "./server-session"

const WS = "0190a7f2-0000-7000-8000-000000000001"
const me = { user: { id: "u1", email: "lina@atlas.ma", name: "Lina", locale: "fr" }, activeWorkspaceId: WS, twoFactorEnabled: false }

function answer(table: Record<string, unknown | Error>) {
  vi.spyOn(apiClient, "get").mockImplementation(async (url: string) => {
    const found = table[url]
    if (found instanceof Error) throw found
    if (found === undefined) throw new Error(`unexpected ${url}`)
    return { data: found }
  })
}

const refused = (code: string) =>
  new AxiosError("Forbidden", "403", {} as InternalAxiosRequestConfig, null, { status: 403, data: { code }, statusText: "Forbidden", headers: {}, config: {} as InternalAxiosRequestConfig })

describe("the Nexora server's sign-in answers, for the existing screens (B1b step 5)", () => {
  afterEach(() => vi.restoreAllMocks())

  it("turns a two-step sign-in into the screens' mfaRequired / mfaToken", () => {
    expect(loginFromServer({ twoFactorRequired: true, challengeId: "ch_123" })).toEqual({ mfaRequired: true, mfaToken: "ch_123" })
    expect(loginFromServer({ user: me.user })).toMatchObject({ success: true, id: "u1", email: "lina@atlas.ma", role: "user" })
    expect(loginFromServer({ success: true, user: { id: "x" } })).toBeNull() // an older answer passes through unchanged
    expect(isServerMe(me)).toBe(true)
    expect(isServerMe({ id: "u1" })).toBe(false)
  })

  it("reads the set-up key from the otpauth address", () => {
    expect(setupFromServer({ otpauthUrl: "otpauth://totp/Nexora%3Alina?secret=ABCD2345&issuer=Nexora" })).toEqual({ secret: "ABCD2345", qrCodeUrl: "otpauth://totp/Nexora%3Alina?secret=ABCD2345&issuer=Nexora" })
  })

  it("builds the account from the session's company: role and permissions as the server enforces them", async () => {
    answer({
      "/me/workspaces": [{ id: WS, name: "Atlas", currency: "MAD", role: { key: "manager", name: "Manager" }, isOwner: false }],
      "/auth/2fa": { enabled: false, recoveryCodesLeft: 0, passcodeSet: true, required: false },
      [`/workspaces/${WS}/context`]: { workspaceId: WS, role: { key: "manager", name: "Manager" }, isOwner: false, permissions: ["projects:read", "time:approve"] },
    })
    expect(await accountFromServer(me)).toMatchObject({ id: "u1", role: "user", workspaceId: WS, permissions: ["projects:read", "time:approve"], isPasscodeLocked: true, twoFactorRequired: false })
  })

  it("asks an owner to set up two-factor when the company refuses them without it (IAM-05)", async () => {
    answer({
      "/me/workspaces": [{ id: WS, name: "Atlas", currency: "MAD", role: { key: "admin", name: "Administrator" }, isOwner: true }],
      "/auth/2fa": { enabled: false, recoveryCodesLeft: 0, passcodeSet: false, required: true },
      [`/workspaces/${WS}/context`]: refused("err_twoFactorRequired"),
    })
    expect(await accountFromServer(me)).toMatchObject({ role: "admin", workspaceId: WS, permissions: [], twoFactorRequired: true })
  })

  it("does not hide other refusals", async () => {
    answer({
      "/me/workspaces": [{ id: WS, name: "Atlas", currency: "MAD", role: { key: "employee", name: "Employee" }, isOwner: false }],
      "/auth/2fa": { enabled: false, recoveryCodesLeft: 0, passcodeSet: false, required: false },
      [`/workspaces/${WS}/context`]: refused("err_forbidden"),
    })
    await expect(accountFromServer(me)).rejects.toThrow()
  })

  it("signs in a person without any company yet", async () => {
    answer({ "/me/workspaces": [], "/auth/2fa": { enabled: false, recoveryCodesLeft: 0, passcodeSet: false, required: false } })
    expect(await accountFromServer({ ...me, activeWorkspaceId: null })).toMatchObject({ workspaceId: undefined, permissions: [], role: "user" })
  })
})
