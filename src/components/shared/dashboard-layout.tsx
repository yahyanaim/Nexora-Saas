"use client"
import React from "react"
import { SidebarProvider } from "../ui/sidebar"
import { DashboardSidebar } from "./sidebar-chunks/dashboard-sidebar"
import { DashboardHeader } from "./header-chunks/dashboard-header"
import { LockScreen } from "./lock-screen"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
interface Props {
  children: React.ReactNode
}

export const DashboardLayout = ({ children }: Props) => {
  const { isPasscodeLocked } = useAuthGuard()
  const { isUnlocked } = useLockScreenStore()

  if (isPasscodeLocked && !isUnlocked) return <LockScreen />

  return (
    <SidebarProvider className="flex h-dvh w-full overflow-hidden">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="flex flex-1 flex-col overflow-hidden rounded-md bg-background ring ring-foreground/10">
          <DashboardHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
