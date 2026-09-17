"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Users,
  ShieldUser,
  Ban,
  Receipt,
  CreditCard,
  BadgeCheck,
  FolderKanban,
  Files,
  ChartNoAxesCombined,
  Sun,
  Moon,
  LockKeyhole,
  LogOut,
  ArrowRight,
  User as UserIcon,
  Terminal,
  History,
} from "@/components/ui/carbon/icons"
import { getDemoUsers, getDemoInvoices } from "@/lib/demo-data"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { useLogout } from "@/hooks/auth/use-logout"

export interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Enterprise Global Command Palette for Nexora SaaS.
 * Triggered via Cmd+K / Ctrl+K or clicking the search trigger in DashboardHeader.
 * Provides instant keyboard navigation across pages, users, invoices, and system actions.
 */
export function CommandPalette({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled && setControlledOpen ? setControlledOpen : setInternalOpen

  const router = useRouter()
  const { setTheme } = useTheme()
  const { lock } = useLockScreenStore()
  const { mutation: logoutMutation } = useLogout()

  // Register global Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, setOpen])

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const demoUsers = React.useMemo(() => {
    try {
      return getDemoUsers().slice(0, 6)
    } catch {
      return []
    }
  }, [])

  const demoInvoices = React.useMemo(() => {
    try {
      return getDemoInvoices().slice(0, 5)
    } catch {
      return []
    }
  }, [])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Quick Navigation & Command Palette"
      description="Search across pages, users, invoices, and system actions"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No matching results found.</CommandEmpty>

        {/* 1. Navigation Pages */}
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/overview"))}
          >
            <ChartNoAxesCombined className="mr-2 size-4 text-primary" />
            <span>Dashboard Analytics</span>
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/users"))}
          >
            <Users className="mr-2 size-4 text-primary" />
            <span>Users Management</span>
            <CommandShortcut>G U</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/staffs"))}
          >
            <ShieldUser className="mr-2 size-4 text-blue-500" />
            <span>Staff Directory</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/banned-users"))}
          >
            <Ban className="mr-2 size-4 text-destructive" />
            <span>Banned Accounts & Sanctions</span>
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/billing/subscriptions"))}
          >
            <BadgeCheck className="mr-2 size-4 text-emerald-500" />
            <span>Subscriptions & Usage</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/plans"))}
          >
            <CreditCard className="mr-2 size-4 text-primary" />
            <span>Plans Catalog</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/invoices"))}
          >
            <Receipt className="mr-2 size-4 text-primary" />
            <span>Invoices</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/projects"))}
          >
            <FolderKanban className="mr-2 size-4 text-amber-500" />
            <span>Projects Workspace</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/files"))}
          >
            <Files className="mr-2 size-4 text-muted-foreground" />
            <span>Files Explorer</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/developer"))}
          >
            <Terminal className="mr-2 size-4 text-blue-500" />
            <span>Developer & API Portal</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/en/dashboard/audit-logs"))}
          >
            <History className="mr-2 size-4 text-emerald-500" />
            <span>Audit Logs & Security Timeline</span>
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 2. Platform Users */}
        {demoUsers.length > 0 && (
          <CommandGroup heading="Platform Users">
            {demoUsers.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.name} ${user.email} user`}
                onSelect={() =>
                  runCommand(() => router.push(`/en/dashboard/users`))
                }
              >
                <SpaceAvatar
                  src={user.avatar}
                  name={user.name}
                  profileColor={user.profileColor}
                  size="xs"
                  className="mr-2"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <ArrowRight className="ml-auto size-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* 3. Invoices */}
        {demoInvoices.length > 0 && (
          <CommandGroup heading="Recent Invoices">
            {demoInvoices.map((inv) => (
              <CommandItem
                key={inv.id}
                value={`${inv.invoiceNumber} ${inv.user?.name || "Client"} invoice`}
                onSelect={() =>
                  runCommand(() => router.push(`/en/dashboard/invoices`))
                }
              >
                <Receipt className="mr-2 size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-xs">
                    {inv.invoiceNumber} — {inv.user?.name || "Client"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ${inv.total?.toLocaleString() ?? "0"} · {inv.status}
                  </span>
                </div>
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  {inv.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* 4. Quick Actions */}
        <CommandGroup heading="Actions & System">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 size-4 text-amber-500" />
            <span>Switch to IBM Carbon Light Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 size-4 text-indigo-400" />
            <span>Switch to IBM Carbon Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => lock())}>
            <LockKeyhole className="mr-2 size-4 text-muted-foreground" />
            <span>Lock Workstation Screen</span>
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/en/dashboard/settings"))
            }
          >
            <UserIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Account Profile & Security</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => logoutMutation.mutate())
            }
          >
            <LogOut className="mr-2 size-4 text-destructive" />
            <span className="text-destructive">Sign Out of Nexora</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
