"use client"
import React from "react"
import { SidebarProvider } from "../ui/sidebar"
import { DashboardSidebar } from "./sidebar-chunks/dashboard-sidebar"
import { DashboardHeader } from "./header-chunks/dashboard-header"
import { LockScreen } from "./lock-screen"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { ErrorBoundary } from "./error-boundary"
interface Props {
  children: React.ReactNode
}

export const DashboardLayout = ({ children }: Props) => {
  const { isPasscodeLocked } = useAuthGuard()
  const { isUnlocked } = useLockScreenStore()

  if (isPasscodeLocked && !isUnlocked) return <LockScreen />

  return (
    <SidebarProvider className="flex h-dvh w-full overflow-hidden bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </SidebarProvider>
  )
}
