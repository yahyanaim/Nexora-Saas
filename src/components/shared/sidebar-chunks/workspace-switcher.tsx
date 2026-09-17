"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Building,
  Check,
  ChevronDown,
  Add,
} from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface Workspace {
  id: string
  name: string
  plan: "Enterprise" | "Pro" | "Free"
  membersCount: number
}

const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: "ws-1",
    name: "Nexora Enterprise HQ",
    plan: "Enterprise",
    membersCount: 8,
  },
  {
    id: "ws-2",
    name: "Acme Cloud Ventures",
    plan: "Pro",
    membersCount: 3,
  },
  {
    id: "ws-3",
    name: "Personal Sandbox",
    plan: "Free",
    membersCount: 1,
  },
]

/**
 * Multi-Tenant Workspace Switcher for Nexora SaaS.
 * Allows corporate users to switch organizations and client workspaces seamlessly.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const [workspaces] = React.useState<Workspace[]>(DEFAULT_WORKSPACES)
  const [activeWorkspace, setActiveWorkspace] = React.useState<Workspace>(
    DEFAULT_WORKSPACES[0]!
  )

  const handleSwitch = (ws: Workspace) => {
    setActiveWorkspace(ws)
    toast.success(`Switched active workspace to "${ws.name}"`)
  }

  const handleCreateNew = () => {
    toast.info("Workspace creation dialog would open here in full multi-tenant mode.")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            className
          )}
          aria-label="Select workspace"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building className="size-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">
                {activeWorkspace.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {activeWorkspace.plan} · {activeWorkspace.membersCount} seats
              </span>
            </div>
          </div>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-64 p-1.5 shadow-md border-border/80"
      >
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspaces ({workspaces.length})
        </DropdownMenuLabel>

        {workspaces.map((ws) => {
          const isSelected = ws.id === activeWorkspace.id

          return (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => handleSwitch(ws)}
              className={cn(
                "flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer rounded-md text-xs",
                isSelected ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building className="size-3.5 text-primary shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-foreground font-medium">
                    {ws.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {ws.membersCount} team members
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1 py-0 font-mono",
                    ws.plan === "Enterprise"
                      ? "border-primary/30 text-primary bg-primary/5"
                      : ws.plan === "Pro"
                      ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {ws.plan}
                </Badge>
                {isSelected && <Check className="size-3 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary cursor-pointer hover:bg-primary/5"
        >
          <Add className="size-3.5" />
          <span>Create Workspace...</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
