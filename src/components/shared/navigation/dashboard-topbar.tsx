"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
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
import { NexusMark, NexusPattern } from "@/components/ui/nexus"

// PERF-01: search and the bell read many modules; they load after the page, not with it
const CommandPalette = dynamic(() => import("@/components/shared/command-palette/command-palette").then((m) => m.CommandPalette), { ssr: false })
const WorkNotificationCenter = dynamic(() => import("@/components/shared/notifications/work-notification-center").then((m) => m.WorkNotificationCenter), {
  ssr: false,
  loading: () => <span aria-hidden className={navIconButton} />,
})

/**
 * Nexus shell bar (DS-07): a navy band in both themes with the node pattern
 * and a glow line, holding the brand, section tabs (desktop), search,
 * notifications, language and the profile pill. Below `xl` the tabs move into
 * the drawer. The band renders its children with the dark tokens.
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
      <header className="nx-shell dark relative isolate flex items-center gap-2 overflow-hidden rounded-[26px] p-1.5 text-foreground shadow-lg sm:gap-3">
        <NexusPattern className="-z-10 text-white/[0.09]" />
        <span aria-hidden className="absolute inset-x-6 bottom-0 -z-10 h-px [background:var(--shell-line)] opacity-70" />
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
          <span className="flex size-9 items-center justify-center rounded-full bg-primary shadow-[0_0_0_4px_rgb(38_132_255/0.18)] lg:size-10">
            <NexusMark className="size-6 text-white" />
          </span>
          <span className="font-display hidden text-base font-bold tracking-tight text-white min-[420px]:inline">
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
                    ? "bg-white text-[#062455] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                {/* each area keeps its colour: the dot here, the rail and the page marker */}
                <span aria-hidden className={cn("size-2 rounded-full bg-area", !active && "opacity-80")} />
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
