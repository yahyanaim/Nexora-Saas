import React, { useContext } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, AuthGuardContext } from "./auth-provider"
import * as authApis from "@/lib/api/auth-apis"
import { UPGRADE_REQUIRED_EVENT, SESSION_EXPIRED_EVENT } from "@/lib/myapi/client"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"

// Mock next-intl router/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockPathname = "/dashboard/overview"
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}))

// Test consumer component
function TestConsumer() {
  const auth = useContext(AuthGuardContext)
  if (!auth) return <div>No context</div>
  return (
    <div>
      <div data-testid="auth-loading">{auth.isLoading ? "loading" : "ready"}</div>
      <div data-testid="auth-status">{auth.isAuthenticated ? "authenticated" : "guest"}</div>
      <div data-testid="passcode-locked">{auth.isPasscodeLocked ? "locked" : "open"}</div>
      <div data-testid="user-name">{auth.authedUser?.name || "none"}</div>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  )
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockPathname = "/dashboard/overview"
    window.history.replaceState(null, "", "/")
  })

  it("authenticates user when fetchMyAccountApi succeeds", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce({
      id: "usr-123",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin",
    })

    renderWithProviders(<TestConsumer />)

    expect(screen.getByTestId("auth-loading").textContent).toBe("loading")

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading").textContent).toBe("ready")
    })

    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
    expect(screen.getByTestId("user-name").textContent).toBe("Founder")
  })

  it("exposes isPasscodeLocked from the session user", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce({
      id: "usr-123",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin",
      isPasscodeLocked: true,
    })

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("passcode-locked").textContent).toBe("locked")
    })
  })

  it("sets unauthenticated state when fetchMyAccountApi fails", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockRejectedValueOnce(new Error("Unauthorized"))

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading").textContent).toBe("ready")
    })

    expect(screen.getByTestId("auth-status").textContent).toBe("guest")
    expect(screen.getByTestId("user-name").textContent).toBe("none")
  })

  it("redirects to /dashboard/subscription when UPGRADE_REQUIRED_EVENT is dispatched", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce({
      id: "usr-123",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin",
    })

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT))
    })

    expect(mockPush).toHaveBeenCalledWith("/dashboard/subscription")
  })

  it("navigates only once when several upgrade_required events fire together", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce({
      id: "usr-123",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin",
    })

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
    })

    act(() => {
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT))
      }
    })

    expect(mockPush).toHaveBeenCalledTimes(1)
  })

  it("calls logoutApi and updates state on logout", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce({
      id: "usr-123",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin",
    })
    const logoutSpy = vi.spyOn(authApis, "logoutApi").mockResolvedValueOnce()

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
    })

    await act(async () => {
      screen.getByText("Logout").click()
    })

    expect(logoutSpy).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith("/auth")
  })

  describe("routing guards", () => {
    const founder = { id: "usr-1", name: "Founder", email: "f@saas.test", role: "admin" as const }

    it("sends a guest on a dashboard page to /auth with a next parameter", async () => {
      mockPathname = "/dashboard/users"
      window.history.replaceState(null, "", "/en/dashboard/users?page=2")
      vi.spyOn(authApis, "fetchMyAccountApi").mockRejectedValueOnce(new Error("Unauthorized"))
      const locationReplace = vi.fn()
      vi.stubGlobal("location", { ...window.location, pathname: "/en/dashboard/users", search: "?page=2", replace: locationReplace })

      renderWithProviders(<TestConsumer />)

      await waitFor(() => {
        expect(locationReplace).toHaveBeenCalledWith(
          `/en/auth?next=${encodeURIComponent("/dashboard/users?page=2")}`
        )
      })
      vi.unstubAllGlobals()
    })

    it("sends an authenticated user on /auth to a safe next path", async () => {
      mockPathname = "/auth"
      window.history.replaceState(null, "", "/en/auth?next=%2Fdashboard%2Finvoices")
      vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce(founder)

      renderWithProviders(<TestConsumer />)

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard/invoices"))
    })

    it("ignores an unsafe next path and falls back to the overview", async () => {
      mockPathname = "/auth"
      window.history.replaceState(null, "", "/en/auth?next=https%3A%2F%2Fevil.com")
      vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce(founder)

      renderWithProviders(<TestConsumer />)

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard/overview"))
    })

    it("does not treat /dashboard/authors as an auth page", async () => {
      mockPathname = "/dashboard/authors"
      vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValueOnce(founder)

      renderWithProviders(<TestConsumer />)

      await waitFor(() => {
        expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
      })
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it("logs out and re-locks the passcode screen when the session expires", async () => {
      // Demo mode deliberately ignores session expiry
      vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false")
      vi.spyOn(authApis, "fetchMyAccountApi").mockResolvedValue(founder)
      useLockScreenStore.getState().unlock()

      renderWithProviders(<TestConsumer />)
      await waitFor(() => {
        expect(screen.getByTestId("auth-status").textContent).toBe("authenticated")
      })

      act(() => {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      })

      expect(mockReplace).toHaveBeenCalledWith("/auth")
      expect(useLockScreenStore.getState().isUnlocked).toBe(false)
      vi.unstubAllEnvs()
    })
  })
})
