import React, { useContext } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, AuthGuardContext } from "./auth-provider"
import * as authApis from "@/lib/api/auth-apis"
import { UPGRADE_REQUIRED_EVENT } from "@/lib/myapi/client"

// Mock next-intl router/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/dashboard/overview",
}))

// Test consumer component
function TestConsumer() {
  const auth = useContext(AuthGuardContext)
  if (!auth) return <div>No context</div>
  return (
    <div>
      <div data-testid="auth-loading">{auth.isLoading ? "loading" : "ready"}</div>
      <div data-testid="auth-status">{auth.isAuthenticated ? "authenticated" : "guest"}</div>
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

  it("sets unauthenticated state when fetchMyAccountApi fails", async () => {
    vi.spyOn(authApis, "fetchMyAccountApi").mockRejectedValueOnce(new Error("Unauthorized"))

    renderWithProviders(<TestConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading").textContent).toBe("ready")
    })

    expect(screen.getByTestId("auth-status").textContent).toBe("guest")
    expect(screen.getByTestId("user-name").textContent).toBe("none")
  })

  it("redirects to /dashboard/plans when UPGRADE_REQUIRED_EVENT is dispatched", async () => {
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

    expect(mockPush).toHaveBeenCalledWith("/dashboard/plans")
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
})
