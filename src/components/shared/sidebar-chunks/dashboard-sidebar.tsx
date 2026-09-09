"use client"

import { useMemo, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Image from "next/image"
import { useTranslations } from "next-intl"
import {
  Users,
  Flag,
  UserX,
  KeyRound,
  MonitorSmartphone,
  Bug,
  ShieldUser,
  LogOut,
  FolderKanban,
  Files,
  Receipt,
  ArrowLeftRight,
  CreditCard,
  BadgeCheck,
  ChartNoAxesCombined,
} from "lucide-react"
import { Link, usePathname } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLogout } from "@/hooks/auth/use-logout"
import { Button } from "@/components/ui/button"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ProfilePage } from "../profile-chunks/profile-page"
import { useGetDirection } from "@/hooks/use-get-direction"
import { AdminPermissionsPlatform } from "@/types/roles"

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations()
  const pathname = usePathname()
  const { authedUser, myEmail } = useAuthGuard()
  const { mutation } = useLogout()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { dir } = useGetDirection()

  const userPermissions = useMemo(() => {
    if (!authedUser?.roles?.length) return new Set<string>()

    return new Set(
      authedUser.roles
        .filter((role: any) => role.status === "active")
        .flatMap((role: any) => role.permissions ?? [])
    )
  }, [authedUser])

  const FULL_ACCESS_USER_TYPES = ["admin", "owner"]
  const isFullAccess = FULL_ACCESS_USER_TYPES.includes(
    authedUser?.userType || ""
  )

  const hasPermission = (permission?: AdminPermissionsPlatform) => {
    if (!permission) return true
    if (isFullAccess) return true
    return (
      userPermissions.has(AdminPermissionsPlatform.ALL) ||
      userPermissions.has(permission)
    )
  }

  const data = [
    {
      title: t("dashboard"),
      items: [
        {
          title: t("analytics"),
          url: "/dashboard/overview",
          icon: ChartNoAxesCombined,
          permission: AdminPermissionsPlatform.VIEW_ANALYTICS,
        },
      ],
    },

    {
      title: t("users"),
      items: [
        {
          title: t("users"),
          url: "/dashboard/users",
          icon: Users,
          permission: AdminPermissionsPlatform.USERS_READ,
        },
        {
          title: t("staffs"),
          url: "/dashboard/staffs",
          icon: ShieldUser,
          permission: AdminPermissionsPlatform.STAFFS_READ,
        },
        {
          title: t("bannedUsers"),
          url: "/dashboard/banned-users",
          icon: UserX,
          permission: AdminPermissionsPlatform.BANNED_USERS_READ,
        },
      ],
    },

    {
      title: t("billing"),
      items: [
        {
          title: t("plans"),
          url: "/dashboard/plans",
          icon: CreditCard,
          permission: AdminPermissionsPlatform.PLANS_READ,
        },
        {
          title: t("subscriptions"),
          url: "/dashboard/subscriptions",
          icon: BadgeCheck,
          permission: AdminPermissionsPlatform.SUBSCRIPTIONS_READ,
        },
        {
          title: t("transactions"),
          url: "/dashboard/transactions",
          icon: ArrowLeftRight,
          permission: AdminPermissionsPlatform.TRANSACTIONS_READ,
        },
        {
          title: t("invoices"),
          url: "/dashboard/invoices",
          icon: Receipt,
          permission: AdminPermissionsPlatform.INVOICES_READ,
        },
      ],
    },

    {
      title: t("management"),
      items: [
        {
          title: t("projects"),
          url: "/dashboard/projects",
          icon: FolderKanban,
          permission: AdminPermissionsPlatform.PROJECTS_READ,
        },
        {
          title: t("files"),
          url: "/dashboard/files",
          icon: Files,
          permission: AdminPermissionsPlatform.FILES_READ,
        },
      ],
    },

    {
      title: t("support"),
      items: [
        {
          title: t("reports"),
          url: "/dashboard/content-reports",
          icon: Flag,
          permission: AdminPermissionsPlatform.REPORTS_READ,
        },
        {
          title: t("systemIssues"),
          url: "/dashboard/system-issues",
          icon: Bug,
          permission: AdminPermissionsPlatform.SYSTEM_ISSUES_READ,
        },
      ],
    },

    {
      title: t("system"),
      items: [
        {
          title: t("rolesPermissions"),
          url: "/dashboard/roles",
          icon: KeyRound,
          permission: AdminPermissionsPlatform.ROLES_READ,
        },
        {
          title: t("sessions"),
          url: "/dashboard/sessions",
          icon: MonitorSmartphone,
          permission: AdminPermissionsPlatform.SESSIONS_READ,
        },
        {
          title: t("logout"),
          url: "#",
          icon: LogOut,
        },
      ],
    },
  ]

  const filteredData = useMemo(() => {
    return data
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission)),
      }))
      .filter((group) => group.items.length > 0)
  }, [userPermissions, isFullAccess])

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} {...props}>
      <SidebarHeader className="h-17 bg-background p-2">
        <Link href={"/dashboard/overview"}>
          <div className="flex h-full items-center gap-2">
            <Image
              src={"/app-logo.png"}
              alt=""
              width={100}
              height={100}
              className="h-12 w-12"
            />
            <div className="flex flex-col">
              <p className="font-bold">{t("appName")}</p>
              <span className="text-sm text-muted-foreground">
                {t("sassPlatform")}
              </span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        {filteredData.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-sm">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    pathname?.startsWith(`${item.url}/`)

                  if (item.title === t("logout")) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          className="h-10 gap-3 p-3 text-base"
                          onClick={() => setLogoutOpen(true)}
                        >
                          {item.icon && <item.icon className="size-4.5" />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-10 gap-3 p-3 text-base"
                      >
                        <Link href={item.url}>
                          {item.icon && <item.icon className="size-4.5" />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="bg-background">
        <Sheet>
          <SheetTrigger asChild>
            <div className="flex cursor-pointer items-center gap-2 rounded-lg bg-card p-2">
              <SpaceAvatar
                name={authedUser?.name || ""}
                src={authedUser?.avatar}
                profileColor={authedUser?.profileColor}
                size="xs"
              />
              <div>
                <p className="truncate font-medium">{authedUser?.name || ""}</p>
                <p className="truncate text-xs">
                  {myEmail || authedUser?.username || ""}
                </p>
              </div>
            </div>
          </SheetTrigger>
          <SheetContent>
            <ProfilePage />
          </SheetContent>
        </Sheet>
      </SidebarFooter>

      <SidebarRail />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSureLogout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("youWillBeSignedOut")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => setLogoutOpen(false)}
              variant={"destructive"}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1"
              variant={"red"}
              onClick={() => {
                mutation.mutate()
                setLogoutOpen(false)
              }}
            >
              {t("logout")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}
