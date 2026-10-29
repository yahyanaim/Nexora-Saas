import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { DashboardLayout } from "./dashboard-layout"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"

const authState: { isPasscodeLocked: boolean; authedUser?: { id: string; name: string; email: string; role: string }; logout: () => Promise<void> } = { isPasscodeLocked: false, logout: vi.fn(async () => {}) }
vi.mock("@/hooks/auth/use-auth-guard", () => ({ useAuthGuard: () => authState }))
vi.mock("./lock-screen", () => ({ LockScreen: () => <div>lock-screen</div> }))
vi.mock("./navigation/dashboard-rail", () => ({ DashboardRail: () => <nav>rail</nav> }))
vi.mock("./navigation/dashboard-topbar", () => ({ DashboardTopbar: () => <header>topbar</header> }))
vi.mock("./navigation/mobile-nav-drawer", () => ({ MobileNavDrawer: () => null }))
vi.mock("./navigation/use-dashboard-nav", () => ({ useDashboardNav: () => ({ activeGroup: { id: "organization" } }) }))
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/dashboard" }))
vi.mock("./platform-only", () => ({ PlatformOnly: () => <div>platform-only</div>, NoAccess: () => <div>no-access</div> }))
vi.mock("./skip-link", () => ({ SkipLink: () => null }))
vi.mock("./platform-chunks/console-shared", () => ({ ConsoleStrip: () => null }))
vi.mock("./platform-chunks/workspace-view-banner", () => ({ WorkspaceViewBanner: () => null }))
vi.mock("./platform-chunks/workspace-status-banner", () => ({ WorkspaceStatusBanner: () => null }))
vi.mock("./platform-chunks/support-session-banner", () => ({ SupportSessionBanner: () => null }))
vi.mock("./platform-chunks/platform-notice-banner", () => ({ PlatformNoticeBanner: () => null }))

describe("DashboardLayout", () => {
  beforeEach(() => {
    authState.isPasscodeLocked = false
    authState.authedUser = undefined
    authState.logout = vi.fn(async () => {})
    localStorage.clear()
    useLockScreenStore.getState().lock()
  })

  it("renders the dashboard when the passcode lock is off", () => {
    render(<DashboardLayout>page</DashboardLayout>)
    expect(screen.getByText("page")).toBeInTheDocument()
    expect(screen.queryByText("lock-screen")).not.toBeInTheDocument()
  })

  it("renders only the lock screen for a locked user who has not unlocked", () => {
    authState.isPasscodeLocked = true
    render(<DashboardLayout>page</DashboardLayout>)
    expect(screen.getByText("lock-screen")).toBeInTheDocument()
    expect(screen.queryByText("page")).not.toBeInTheDocument()
  })

  it("renders the dashboard once the session is unlocked", () => {
    authState.isPasscodeLocked = true
    useLockScreenStore.getState().unlock()
    render(<DashboardLayout>page</DashboardLayout>)
    expect(screen.getByText("page")).toBeInTheDocument()
  })

  it("locks after 30 idle minutes when a passcode is set, and signs out when not (D3)", () => {
    vi.useFakeTimers()
    try {
      authState.authedUser = { id: "u1", name: "Lina", email: "lina@atlas.example", role: "employee" }
      authState.isPasscodeLocked = true
      useLockScreenStore.getState().unlock()
      const view = render(<DashboardLayout>page</DashboardLayout>)
      act(() => vi.advanceTimersByTime(29 * 60_000))
      expect(screen.getByText("page")).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(60_000))
      expect(screen.getByText("lock-screen")).toBeInTheDocument()
      view.unmount()

      authState.isPasscodeLocked = false
      localStorage.clear()
      render(<DashboardLayout>page</DashboardLayout>)
      act(() => vi.advanceTimersByTime(31 * 60_000))
      expect(authState.logout).toHaveBeenCalledTimes(1)
      expect(JSON.parse(sessionStorage.getItem("nexora-idle-signed-out")!).minutes).toBe(30)
    } finally {
      vi.useRealTimers()
    }
  })
})
