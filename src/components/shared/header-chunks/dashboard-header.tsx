"use client"

import * as React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LockKeyholeOpen, Search } from "@/components/ui/carbon/icons"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { ChangeTheme } from "./change-theme"
import { ChangeLanguage } from "./change-language"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { CommandPalette } from "@/components/shared/command-palette/command-palette"
import { NotificationCenter } from "@/components/shared/notifications/notification-center"

export const DashboardHeader = () => {
  const t = useTranslations()
  const pathname = usePathname() || ""
  const { isPasscodeLocked } = useAuthGuard()
  const { lock } = useLockScreenStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  const getPageTitle = () => {
    if (pathname.includes("/users")) return t("users")
    if (pathname.includes("/staffs")) return t("staffs") || "Staff"
    if (pathname.includes("/banned-users")) return t("bannedUsers") || "Banned Users"
    if (pathname.includes("/invoices")) return t("invoices")
    if (pathname.includes("/projects")) return t("projects")
    if (pathname.includes("/transactions")) return t("transactions")
    if (pathname.includes("/roles")) return t("roles")
    if (pathname.includes("/plans")) return t("plans")
    if (pathname.includes("/subscriptions")) return t("subscriptions")
    if (pathname.includes("/files")) return t("files")
    if (pathname.includes("/settings")) return t("settings")
    if (pathname.includes("/audit-logs")) return t("auditLogs") || "Audit Logs"
    if (pathname.includes("/developer")) return t("developer") || "Developer & API"
    return t("dashboardOverview")
  }

  return (
    <>
      <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-4 w-full">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="size-9 rounded-md text-muted-foreground hover:text-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Platform /</span>
            <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base capitalize">
              {getPageTitle()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-2.5">
          {/* Quick Search & Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-border/60 bg-muted/40 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            <Search className="size-3.5" />
            <span>Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile search icon button */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="md:hidden flex size-9 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground hover:text-foreground"
            aria-label="Open search"
          >
            <Search className="size-4" />
          </button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Language & Theme Controls */}
          <ChangeTheme />
          <ChangeLanguage />
          <AnimatedThemeToggler />

          {/* Screen Lock */}
          {isPasscodeLocked && (
            <button
              className="p-2 text-muted-foreground hover:text-foreground rounded-md"
              type="button"
              onClick={lock}
              aria-label="Lock screen"
            >
              <LockKeyholeOpen className="size-4" />
            </button>
          )}
        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  )
}
