"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ShieldUser } from "@/components/ui/carbon/icons"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import type { AdminPermissionsPlatform } from "@/types/roles"

/** Shown when a company user opens a page of the Nexora platform console directly. */
export function PlatformOnly() {
  const t = useTranslations()
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        icon={ShieldUser}
        title={<span role="heading" aria-level={1}>{t("platformOnlyTitle")}</span>}
        hint={t("platformOnlyHint")}
        className="bg-card py-16"
        action={
          <Button asChild>
            <Link href="/dashboard/my-work">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </div>
  )
}

/** Shown when someone opens a company page their role does not include. */
export function NoAccess() {
  const t = useTranslations()
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        icon={ShieldUser}
        title={<span role="heading" aria-level={1}>{t("noAccessTitle")}</span>}
        hint={t("noAccessHint")}
        className="bg-card py-16"
        action={
          <Button asChild>
            <Link href="/dashboard/my-work">{t("backToDashboard")}</Link>
          </Button>
        }
      />
    </div>
  )
}

/** Renders the page only when the signed-in user's role grants `permission` (also blocks typed URLs). */
export function RequirePermission({ permission, children }: { permission: AdminPermissionsPlatform; children: React.ReactNode }) {
  const { authedUser } = useAuthGuard()
  if (!authedUser) return null
  return can(authedUser, permission) ? <>{children}</> : <NoAccess />
}
