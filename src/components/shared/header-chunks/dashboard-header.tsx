"use client"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { LockKeyholeOpen } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { ChangeTheme } from "./change-theme"
import { ChangeLanguage } from "./change-language"
import { useTranslations } from "next-intl"

export const DashboardHeader = () => {
  const t = useTranslations()
  const { isPasscodeLocked } = useAuthGuard()
  const { lock } = useLockScreenStore()

  return (
    <SidebarInset className="w-full">
      <header className="flex h-17 shrink-0 items-center justify-between gap-2 border-b bg-card">
        <div className="flex h-full">
          <SidebarTrigger className="h-full w-15" />

          <div className="flex h-full flex-col justify-center">
            <p className="hidden font-bold md:block">
              {t("dashboardOverview")}
            </p>
            <p className="text-lg font-bold md:hidden">{t("dashboard")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-3 md:gap-5">
          <ChangeTheme />
          <ChangeLanguage />
          <AnimatedThemeToggler />
          {isPasscodeLocked && (
            <button className="mx-1" type="button" onClick={lock}>
              <LockKeyholeOpen />
            </button>
          )}
        </div>
      </header>
    </SidebarInset>
  )
}
