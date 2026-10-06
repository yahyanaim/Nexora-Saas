"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Menu, Search, LockKeyholeOpen } from "@/components/ui/carbon/icons"
import { CommandPalette } from "@/components/shared/command-palette/command-palette"
import { WorkNotificationCenter } from "@/components/shared/notifications/work-notification-center"
import { ChangeLanguage } from "@/components/shared/header-chunks/change-language"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { cn } from "@/lib/utils"
import { useDashboardNav } from "./use-dashboard-nav"
import { UserMenu } from "./user-menu"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { navIconButton, navSurface } from "./nav-styles"

/**
 * Floating top bar: brand, section tabs (desktop), search, notifications,
 * language and the profile pill. Below `xl` the tabs move into the drawer.
 */
export function DashboardTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useTranslations()
  const { groups, activeGroup } = useDashboardNav()
  const { isPasscodeLocked } = useAuthGuard()
  const { lock } = useLockScreenStore()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t("openMenu")}
          className={cn(navIconButton, navSurface, "size-12 text-foreground xl:hidden")}
        >
          <Menu className="size-5" />
        </button>

        <Link
          href="/dashboard/overview"
          className={cn(
            navSurface,
            "flex h-12 shrink-0 items-center gap-2.5 py-1.5 pl-1.5 pr-4 lg:h-14 lg:pr-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-info-soft lg:size-10">
            <Image src="/app-logo.png" alt="" width={28} height={28} className="size-6 object-contain" />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground min-[420px]:inline">
            {t("appName")}
          </span>
        </Link>

        <nav
          aria-label={t("mainNavigation")}
          className={cn(navSurface, "hidden h-14 items-center gap-1 p-1.5 xl:flex")}
        >
          {groups.map((group) => {
            const active = group.id === activeGroup?.id
            return (
              <Link
                key={group.id}
                href={group.items[0]!.url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-full px-3 2xl:px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                {group.title}
              </Link>
            )
          })}
        </nav>

        <WorkspaceSwitcher className="hidden md:flex" />

        <div className="flex-1" />

        <div className={cn(navSurface, "flex h-12 items-center gap-0.5 p-1 lg:h-14 lg:p-1.5")}>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t("search")}
            className={navIconButton}
          >
            <Search className="size-[18px]" />
          </button>
          <WorkNotificationCenter />
          <ChangeLanguage className="hidden sm:inline-flex" />
          {isPasscodeLocked && (
            <button type="button" onClick={lock} aria-label={t("lockScreen")} className={navIconButton}>
              <LockKeyholeOpen className="size-[18px]" />
            </button>
          )}
        </div>

        <UserMenu />
      </header>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
