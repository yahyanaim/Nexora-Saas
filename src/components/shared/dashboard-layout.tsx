"use client"
import { InstallHint } from "./pwa/pwa-setup"
import React, { useState } from "react"
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
  // Client contacts stay inside their portal
  const outsidePortal = !!(authedUser as { clientId?: string } | undefined)?.clientId && !isPortalPath(pathname)

  // Typed URLs to pages the role does not include are refused (same table as the menu)
  const denied = !!authedUser && !outsidePortal && !(authedUser as { clientId?: string }).clientId && isRouteDenied(pathname, (p) => can(authedUser, p))

  if (isPasscodeLocked && !isUnlocked) return <LockScreen />

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <div className="px-4 pt-3 md:px-6 md:pt-4">
        <DashboardTopbar onOpenMenu={() => setMenuOpen(true)} />
      </div>
      <div className="flex min-h-0 flex-1 md:ps-6">
        <DashboardRail className="my-6 hidden md:flex" />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <ErrorBoundary>{outsidePortal ? <PortalRedirect /> : blocked ? <PlatformOnly /> : denied ? <NoAccess /> : children}</ErrorBoundary>
          <InstallHint />
        </main>
      </div>
      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  )
}
