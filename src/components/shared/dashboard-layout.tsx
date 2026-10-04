"use client"
import React, { useState } from "react"
import { DashboardTopbar } from "./navigation/dashboard-topbar"
import { DashboardRail } from "./navigation/dashboard-rail"
import { MobileNavDrawer } from "./navigation/mobile-nav-drawer"
import { LockScreen } from "./lock-screen"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { ErrorBoundary } from "./error-boundary"
import { setAuditActor } from "@/lib/workforce/audit"

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

  if (isPasscodeLocked && !isUnlocked) return <LockScreen />

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <div className="px-4 pt-3 md:px-6 md:pt-4">
        <DashboardTopbar onOpenMenu={() => setMenuOpen(true)} />
      </div>
      <div className="flex min-h-0 flex-1 md:ps-6">
        <DashboardRail className="my-6 hidden md:flex" />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <MobileNavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  )
}
