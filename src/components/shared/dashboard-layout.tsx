"use client"
import { InstallHint } from "./pwa/pwa-setup"
import React, { useState } from "react"
import dynamic from "next/dynamic"
import { DashboardTopbar } from "./navigation/dashboard-topbar"
import { DashboardRail } from "./navigation/dashboard-rail"
import { MobileNavDrawer } from "./navigation/mobile-nav-drawer"
import { LockScreen } from "./lock-screen"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { ErrorBoundary } from "./error-boundary"
import { setAuditActor } from "@/lib/workforce/audit"
import { usePathname } from "@/i18n/navigation"
import { isPlatformPath } from "@/lib/permissions/platform"
import { can, isPlatformOperator } from "@/lib/permissions/can"
import { NoAccess, PlatformOnly } from "./platform-only"
import { isRouteDenied } from "@/lib/permissions/routes"
import { isPortalPath } from "@/lib/workforce/portal"
import { PortalRedirect } from "./portal-redirect"
import { SkipLink } from "./skip-link"

// PERF-01: the banners and the console gate read the platform's billing, support and
// customer modules; they load after the shell so every page starts lighter
const ConsoleStrip = dynamic(() => import("./platform-chunks/console-shared").then((m) => m.ConsoleStrip), { ssr: false })
const WorkspaceViewBanner = dynamic(() => import("./platform-chunks/workspace-view-banner").then((m) => m.WorkspaceViewBanner), { ssr: false })
const WorkspaceStatusBanner = dynamic(() => import("./platform-chunks/workspace-status-banner").then((m) => m.WorkspaceStatusBanner), { ssr: false })
const SupportSessionBanner = dynamic(() => import("./platform-chunks/support-session-banner").then((m) => m.SupportSessionBanner), { ssr: false })
const PlatformNoticeBanner = dynamic(() => import("./platform-chunks/platform-notice-banner").then((m) => m.PlatformNoticeBanner), { ssr: false })
// nothing of the console shows until the gate has checked two-factor set-up
const TwoFactorGate = dynamic(() => import("./platform-chunks/two-factor-gate").then((m) => m.TwoFactorGate), { ssr: false })

interface Props {
  children: React.ReactNode
}

/**
 * App shell: floating top bar, floating icon rail (md+) and a drawer for
 * small screens, around a scrollable content area on the grey canvas.
 */
export const DashboardLayout = ({ children }: Props) => {
  const { isPasscodeLocked, authedUser } = useAuthGuard()
  // Audit entries name whoever is signed in (PLT-12)
  setAuditActor(authedUser && { id: authedUser.id, name: authedUser.name, email: authedUser.email ?? "", role: String(authedUser.role) })
  const { isUnlocked } = useLockScreenStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const blocked = !!authedUser && isPlatformPath(pathname) && !isPlatformOperator(authedUser)
  const onConsole = !!authedUser && isPlatformPath(pathname) && isPlatformOperator(authedUser)
  const viewingWorkspace = !!authedUser && !isPlatformPath(pathname) && isPlatformOperator(authedUser)
  // Client contacts stay inside their portal
  const outsidePortal = !!(authedUser as { clientId?: string } | undefined)?.clientId && !isPortalPath(pathname)

  // Typed URLs to pages the role does not include are refused (same table as the menu)
  const denied = !!authedUser && !outsidePortal && !(authedUser as { clientId?: string }).clientId && isRouteDenied(pathname, (p) => can(authedUser, p))

  if (isPasscodeLocked && !isUnlocked) return <LockScreen />

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <SkipLink />
      <div className="px-4 pt-3 md:px-6 md:pt-4">
        <DashboardTopbar onOpenMenu={() => setMenuOpen(true)} />
      </div>
      <div className="flex min-h-0 flex-1 md:ps-6">
        <DashboardRail className="my-6 hidden md:flex" />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
          <ErrorBoundary>{outsidePortal ? <PortalRedirect /> : blocked ? <PlatformOnly /> : denied ? <NoAccess /> : onConsole ? <TwoFactorGate><ConsoleStrip />{children}</TwoFactorGate> : <>{viewingWorkspace && <WorkspaceViewBanner />}<WorkspaceStatusBanner /><PlatformNoticeBanner />{!viewingWorkspace && <SupportSessionBanner />}{children}</>}</ErrorBoundary>
          <InstallHint />
        </main>
      </div>
      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  )
}
