import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PasscodeDialog } from "./passcode-dialog"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import * as authApis from "@/lib/api/auth-apis"
import { IntlWrapper } from "@/test/intl"
import messages from "@/messages/en.json"

const updatedUser = vi.fn()
vi.mock("@/hooks/auth/use-auth-guard", () => ({
  useAuthGuard: () => ({
    authedUser: { id: "u1", name: "Founder" },
    updatedUser,
    isPasscodeLocked: false,
  }),
}))

describe("PasscodeDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    updatedUser.mockReset()
    useLockScreenStore.getState().lock()
  })

  it("keeps the current session unlocked after enabling the passcode lock", async () => {
    const save = vi
      .spyOn(authApis, "changeProfileInfApi")
      .mockResolvedValue({ isPasscodeLocked: true } as never)
    const onOpenChange = vi.fn()

    render(
      <QueryClientProvider client={new QueryClient()}>
        <IntlWrapper>
          <PasscodeDialog open onOpenChange={onOpenChange} />
        </IntlWrapper>
      </QueryClientProvider>
    )

    const inputs = document.querySelectorAll("input")
    expect(inputs.length).toBe(2)
    inputs.forEach((input) => fireEvent.change(input, { target: { value: "1234" } }))
    fireEvent.click(screen.getByRole("button", { name: messages.save }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ passcodeLock: "1234", isPasscodeLocked: true })
    )
    expect(updatedUser).toHaveBeenCalledWith({ isPasscodeLocked: true })
    expect(useLockScreenStore.getState().isUnlocked).toBe(true)
    expect(localStorage.getItem("passcode")).toBeNull()
  })
})
