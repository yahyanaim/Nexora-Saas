import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { LockScreen } from "./lock-screen"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import * as authApis from "@/lib/api/auth-apis"
import { IntlWrapper } from "@/test/intl"

vi.mock("@/hooks/auth/use-auth-guard", () => ({
  useAuthGuard: () => ({ authedUser: { id: "u1", name: "Founder", email: "f@saas.test" } }),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function renderLockScreen() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <IntlWrapper>
        <LockScreen />
      </IntlWrapper>
    </QueryClientProvider>
  )
}

const typeDigits = (digits: string) => {
  for (const key of digits) fireEvent.keyDown(window, { key })
}

describe("LockScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useLockScreenStore.getState().lock()
  })

  it("verifies the passcode after 4 digits and unlocks on success", async () => {
    const verify = vi.spyOn(authApis, "verifyPasscodeApi").mockResolvedValue(true)
    renderLockScreen()

    typeDigits("1234")

    await waitFor(() => expect(useLockScreenStore.getState().isUnlocked).toBe(true))
    expect(verify).toHaveBeenCalledTimes(1)
    expect(verify.mock.calls[0]![0]).toBe("1234")
  })

  it("stays locked when the passcode is wrong", async () => {
    const verify = vi.spyOn(authApis, "verifyPasscodeApi").mockResolvedValue(false)
    renderLockScreen()

    typeDigits("9999")

    await waitFor(() => expect(verify).toHaveBeenCalled())
    expect(useLockScreenStore.getState().isUnlocked).toBe(false)
  })

  it("does not verify before 4 digits are entered", () => {
    const verify = vi.spyOn(authApis, "verifyPasscodeApi").mockResolvedValue(true)
    renderLockScreen()

    typeDigits("12")

    expect(verify).not.toHaveBeenCalled()
  })
})
