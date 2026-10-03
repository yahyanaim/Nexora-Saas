import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardLayout } from "./dashboard-layout"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"

const authState = { isPasscodeLocked: false }
vi.mock("@/hooks/auth/use-auth-guard", () => ({ useAuthGuard: () => authState }))
vi.mock("./lock-screen", () => ({ LockScreen: () => <div>lock-screen</div> }))
vi.mock("./navigation/dashboard-rail", () => ({ DashboardRail: () => <nav>rail</nav> }))
vi.mock("./navigation/dashboard-topbar", () => ({ DashboardTopbar: () => <header>topbar</header> }))
vi.mock("./navigation/mobile-nav-drawer", () => ({ MobileNavDrawer: () => null }))

describe("DashboardLayout", () => {
  beforeEach(() => {
    authState.isPasscodeLocked = false
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
})
