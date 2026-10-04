"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { LogOut, Moon, Sun } from "@/components/ui/carbon/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useGetDirection } from "@/hooks/use-get-direction"
import { cn } from "@/lib/utils"
import { useDashboardNav } from "./use-dashboard-nav"
import { LogoutDialog } from "./user-menu"
import { navIconButton } from "./nav-styles"

/**
 * Floating icon rail: light/dark switch, the pages of the active section,
 * and logout. Labels appear as tooltips; the page header shows the full title.
 */
export function DashboardRail({ className }: { className?: string }) {
  const t = useTranslations()
  const { activeGroup, isActive } = useDashboardNav()
  const { isDark: themeIsDark, setTheme } = useTheme()
  // The theme is only known in the browser; render the neutral state until then
  const hasMounted = useHasMounted()
  const isDark = hasMounted && themeIsDark
  const isLight = hasMounted && !themeIsDark
  const { dir } = useGetDirection()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const tooltipSide = dir === "rtl" ? "left" : "right"

  return (
    <aside
      aria-label={activeGroup?.title}
      className={cn(
        "flex w-[72px] shrink-0 flex-col items-center gap-3 rounded-[28px] border border-border bg-card py-4 shadow-panel",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label={t("lightMode")}
          aria-pressed={isLight}
          className={cn(
            navIconButton,
            "size-9",
            isLight && "bg-card text-foreground shadow-xs hover:bg-card"
          )}
        >
          <Sun className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label={t("darkMode")}
          aria-pressed={isDark}
          className={cn(
            navIconButton,
            "size-9",
            isDark && "bg-card text-foreground shadow-xs hover:bg-card"
          )}
        >
          <Moon className="size-[18px]" />
        </button>
      </div>

      <div className="my-1 h-px w-8 bg-border" />

      <nav className="flex flex-1 flex-col items-center gap-2">
        {activeGroup?.items.map((item) => {
          const active = isActive(item.url)
          return (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                <Link
                  href={item.url}
                  aria-label={item.title}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    navIconButton,
                    "size-12",
                    active && "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide} className="rounded-lg text-sm">
                {item.title}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            aria-label={t("logout")}
            className={cn(navIconButton, "size-11 hover:bg-danger-soft hover:text-destructive")}
          >
            <LogOut className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="rounded-lg text-sm">
          {t("logout")}
        </TooltipContent>
      </Tooltip>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </aside>
  )
}
