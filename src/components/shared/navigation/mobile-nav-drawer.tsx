"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { LogOut } from "@/components/ui/carbon/icons"
import { ChangeLanguage } from "@/components/shared/header-chunks/change-language"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useGetDirection } from "@/hooks/use-get-direction"
import { cn } from "@/lib/utils"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { useDashboardNav } from "./use-dashboard-nav"
import { LogoutDialog } from "./user-menu"
import { navIconButton } from "./nav-styles"

/** Full navigation for screens below `lg`: every section and page, labelled. */
export function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const { groups, isActive, mode } = useDashboardNav()
  const { authedUser, myEmail } = useAuthGuard()
  const { dir } = useGetDirection()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={dir === "rtl" ? "right" : "left"}
          className="max-w-[320px] gap-5 bg-card p-4 pt-5 backdrop-blur-none"
        >
          <div className="flex items-center gap-2.5 pe-10">
            <span className="flex size-10 items-center justify-center rounded-full bg-info-soft">
              <Image src="/app-logo.png" alt="" width={28} height={28} className="size-6 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">{t("appName")}</span>
          </div>

          {mode !== "console" && <WorkspaceSwitcher className="w-full justify-start" showName />}

          <nav aria-label={t("mainNavigation")} className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const active = isActive(item.url)
                  return (
                    <Link
                      key={item.url}
                      href={item.url}
                      onClick={() => onOpenChange(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-[18px]" />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto flex items-center gap-2 rounded-2xl border border-border p-2">
            <SpaceAvatar
              name={authedUser?.name || ""}
              src={authedUser?.avatar}
              profileColor={authedUser?.profileColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{authedUser?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{myEmail}</p>
            </div>
            <ChangeLanguage className="sm:hidden" />
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label={t("logout")}
              className={cn(navIconButton, "hover:bg-danger-soft hover:text-destructive")}
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
