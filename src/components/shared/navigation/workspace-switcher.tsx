"use client"

import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building, Check, ChevronsUpDown } from "@/components/ui/carbon/icons"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useCurrentWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { cn } from "@/lib/utils"
import { navSurface } from "./nav-styles"

/** Top-bar pill that shows the current company and switches between them. */
export function WorkspaceSwitcher({ className, showName = false }: { className?: string; showName?: boolean }) {
  const t = useTranslations()
  const allWorkspaces = useWorkspaceStore((s) => s.workspaces)
  const { authedUser } = useAuthGuard()
  // An employee account belongs to one company; only the platform team and demo admins switch
  const ownWorkspace = (authedUser as { workspaceId?: string } | undefined)?.workspaceId
  const workspaces = ownWorkspace ? allWorkspaces.filter((w) => w.id === ownWorkspace) : allWorkspaces
  const setCurrent = useWorkspaceStore((s) => s.setCurrent)
  const current = useCurrentWorkspace()
  // The saved choice is only known in the browser
  const hasMounted = useHasMounted()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={hasMounted ? `${t("switchWorkspace")}: ${current.name}` : t("switchWorkspace")}
          title={hasMounted ? current.name : undefined}
          className={cn(
            navSurface,
            "flex h-12 min-w-0 items-center gap-2 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-14 lg:px-4",
            className
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-foreground">
            <Building className="size-4" />
          </span>
          {/* In the top bar the name shows only where there is room; the menu always lists it */}
          <span className={cn("max-w-36 truncate", !showName && "hidden min-[1800px]:inline")}>
            {hasMounted ? current.name : " "}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("workspaces")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            className="h-10 text-sm"
            onClick={() => setCurrent(workspace.id)}
          >
            <span className="flex-1 truncate">{workspace.name}</span>
            <span className="text-xs text-muted-foreground">{workspace.currency}</span>
            {workspace.id === current.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
