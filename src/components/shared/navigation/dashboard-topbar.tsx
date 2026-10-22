"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Menu, Search, LockKeyholeOpen } from "@/components/ui/carbon/icons"
import { ChangeLanguage } from "@/components/shared/header-chunks/change-language"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { cn } from "@/lib/utils"
import { useDashboardNav } from "./use-dashboard-nav"
import { UserMenu } from "./user-menu"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { navIconButton, navSurface } from "./nav-styles"

// PERF-01: search and the bell read many modules; they load after the page, not with it
const CommandPalette = dynamic(() => import("@/components/shared/command-palette/command-palette").then((m) => m.CommandPalette), { ssr: false })
const WorkNotificationCenter = dynamic(() => import("@/components/shared/notifications/work-notification-center").then((m) => m.WorkNotificationCenter), {
  ssr: false,
  loading: () => <span aria-hidden className={navIconButton} />,
})

/**
 * Floating top bar: brand, section tabs (desktop), search, notifications,
 * language and the profile pill. Below `xl` the tabs move into the drawer.
 */
export function DashboardTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useTranslations()
  const { groups, activeGroup, mode } = useDashboardNav()
  const { isPasscodeLocked } = useAuthGuard()
  const { lock } = useLockScreenStore()
  const [searchOpen, setSearchOpen] = useState(false)
  // the palette is fetched the first time it opens, then stays mounted
  const [searchUsed, setSearchUsed] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchUsed(true)
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

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
          href={mode === "console" ? "/dashboard/console" : "/dashboard/overview"}
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
                data-area={group.id}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full px-3 2xl:px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
              >
                {/* each area keeps its colour: the dot here, the rail and the page marker (DS-07) */}
                <span aria-hidden className={cn("size-2 rounded-full bg-area", active && "ring-2 ring-white/90")} />
                {group.title}
              </Link>
            )
          })}
        </nav>

        {/* the console is not about one workspace */}
        {mode !== "console" && <WorkspaceSwitcher className="hidden md:flex" />}

        <div className="flex-1" />

        <div className={cn(navSurface, "flex h-12 items-center gap-0.5 p-1 lg:h-14 lg:p-1.5")}>
          <button
            type="button"
            onClick={() => { setSearchUsed(true); setSearchOpen(true) }}
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

      {searchUsed && <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />}
    </>
  )
}
