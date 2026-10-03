"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { ChevronDown, LogOut, User, Moon, Sun } from "@/components/ui/carbon/icons"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLogout } from "@/hooks/auth/use-logout"
import { useTheme } from "@/hooks/use-theme"
import { ProfilePage } from "../profile-chunks/profile-page"

/** Confirmation dialog shared by every logout entry point. */
export function LogoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const { mutation } = useLogout()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("areYouSureLogout")}</AlertDialogTitle>
          <AlertDialogDescription>{t("youWillBeSignedOut")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              mutation.mutate()
              onOpenChange(false)
            }}
          >
            {t("logout")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Profile pill in the top bar: avatar, name and role (name hidden below xl). */
export function UserMenu() {
  const t = useTranslations()
  const { authedUser, myEmail } = useAuthGuard()
  const { isDark, setTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const name = authedUser?.name || ""

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("profile")}
            className="flex h-12 items-center gap-3 rounded-full border border-border bg-card p-1 shadow-panel transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-14 lg:p-1.5 xl:pr-4"
          >
            <SpaceAvatar
              name={name}
              src={authedUser?.avatar}
              profileColor={authedUser?.profileColor}
              size="md"
            />
            <span className="hidden min-w-0 max-w-44 flex-col text-left xl:flex">
              <span className="truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="truncate text-xs text-muted-foreground">
                <span className="capitalize">{authedUser?.role}</span>
                {authedUser?.role && myEmail ? " · " : ""}
                {myEmail}
              </span>
            </span>
            <ChevronDown className="hidden text-muted-foreground xl:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{myEmail}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem tabIndex={0} className="h-9 text-sm" onClick={() => setProfileOpen(true)}>
            <User />
            {t("profile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            tabIndex={0}
            className="h-9 text-sm"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun /> : <Moon />}
            {isDark ? t("lightMode") : t("darkMode")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            tabIndex={0}
            variant="destructive"
            className="h-9 text-sm"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent>
          <ProfilePage />
        </SheetContent>
      </Sheet>
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
