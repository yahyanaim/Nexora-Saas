"use client"

import * as React from "react"
import {
  Bell,
  CheckCircle,
  ShieldAlert,
  CreditCard,
  Check,
  Trash2,
  Information,
} from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { navIconButton } from "@/components/shared/navigation/nav-styles"

export interface NotificationItem {
  id: string
  title: string
  message: string
  category: "security" | "billing" | "team" | "system"
  timestamp: string
  isRead: boolean
  /** Page where the item is handled; the title becomes a link */
  href?: string
}

export interface NotificationLabels {
  title: string
  newCount: (n: number) => string
  markAllRead: string
  all: string
  unread: string
  empty: string
  open: string
  unreadSr: (n: number) => string
  markRead: string
  markUnread: string
  dismiss: string
}

const ENGLISH: NotificationLabels = {
  title: "Notifications",
  newCount: (n) => `${n} new`,
  markAllRead: "Mark all read",
  all: "All",
  unread: "Unread",
  empty: "No notifications to display.",
  open: "Open notifications",
  unreadSr: (n) => `${n} unread`,
  markRead: "Mark as read",
  markUnread: "Mark as unread",
  dismiss: "Dismiss",
}

function readIds(key?: string): string[] {
  if (!key) return []
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}
function writeIds(key: string | undefined, ids: Set<string>) {
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify([...ids].slice(-300)))
  } catch {
    // Storage full or blocked: read state just isn't remembered
  }
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Security Sanction Enforced",
    message: "Suspicious API activity detected. Account Viktor Reznov was restricted.",
    category: "security",
    timestamp: "10m ago",
    isRead: false,
  },
  {
    id: "notif-2",
    title: "Invoice #INV-2024-001 Paid",
    message: "TechCorp Enterprise completed payment of $4,500.00 via Stripe.",
    category: "billing",
    timestamp: "45m ago",
    isRead: false,
  },
  {
    id: "notif-3",
    title: "New Role Assigned",
    message: "Sophia Vance was granted the 'DevOps Engineer' operational access key.",
    category: "team",
    timestamp: "2h ago",
    isRead: false,
  },
  {
    id: "notif-4",
    title: "Nexora Cloud v2.4 Live",
    message: "Platform upgrade completed with IBM Carbon Light mode and optimized assets.",
    category: "system",
    timestamp: "1d ago",
    isRead: true,
  },
]

/**
 * Enterprise Notification Center Popover for Nexora SaaS.
 * Renders in DashboardHeader with unread counter, categorized event feed,
 * and dismissal controls.
 */
export function NotificationCenter({
  items = INITIAL_NOTIFICATIONS,
  labels = ENGLISH,
  storageKey,
  onNavigate,
}: {
  items?: NotificationItem[]
  labels?: NotificationLabels
  /** Remembers read and dismissed items in this browser */
  storageKey?: string
  onNavigate?: (href: string) => void
} = {}) {
  const [open, setOpen] = React.useState(false)
  const [readSet, setReadSet] = React.useState(() => new Set(readIds(storageKey && `${storageKey}:read`)))
  const [hidden, setHidden] = React.useState(() => new Set(readIds(storageKey && `${storageKey}:hidden`)))
  const [filter, setFilter] = React.useState<"all" | "unread">("all")
  const notifications = React.useMemo(
    () => items.filter((n) => !hidden.has(n.id)).map((n) => ({ ...n, isRead: n.isRead !== readSet.has(n.id) })),
    [items, hidden, readSet]
  )
  const updateRead = (next: Set<string>) => {
    setReadSet(next)
    writeIds(storageKey && `${storageKey}:read`, next)
  }

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const filteredNotifications = React.useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead)
    }
    return notifications
  }, [notifications, filter])

  // An item's read flag flips when its id is in the set, so items that start read can be marked unread
  const markAllAsRead = () => {
    const next = new Set(readSet)
    for (const n of notifications) if (!n.isRead) next.has(n.id) ? next.delete(n.id) : next.add(n.id)
    updateRead(next)
  }

  const toggleRead = (id: string) => {
    const next = new Set(readSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateRead(next)
  }

  const deleteNotification = (id: string) => {
    const next = new Set(hidden).add(id)
    setHidden(next)
    writeIds(storageKey && `${storageKey}:hidden`, next)
  }

  const follow = (n: NotificationItem) => {
    if (!n.href) return
    if (!n.isRead) toggleRead(n.id)
    setOpen(false)
    onNavigate?.(n.href)
  }

  const getCategoryIcon = (category: NotificationItem["category"]) => {
    switch (category) {
      case "security":
        return <ShieldAlert className="size-4 text-destructive shrink-0" />
      case "billing":
        return <CreditCard className="size-4 text-success-foreground shrink-0" />
      case "team":
        return <CheckCircle className="size-4 text-primary shrink-0" />
      case "system":
      default:
        return <Information className="size-4 text-muted-foreground shrink-0" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(navIconButton, "relative")}
          aria-label={labels.open}
          type="button"
        >
          <Bell className="size-[18px] pointer-events-none" />
          {unreadCount > 0 && (
            <>
              <span className="pointer-events-none absolute top-2.5 right-2.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-in zoom-in-50" />
              <span className="sr-only">{labels.unreadSr(unreadCount)}</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-xl border-border/80 z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {labels.title}
            </h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5 tabular-nums">
                {labels.newCount(unreadCount)}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs text-primary hover:text-primary/90 px-2"
            >
              <Check className="me-1 size-3" />
              {labels.markAllRead}
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-border/60 px-4 py-1.5 text-xs text-muted-foreground gap-3 bg-card">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "pb-1 font-medium transition-colors hover:text-foreground",
              filter === "all"
                ? "border-b-2 border-primary text-foreground font-semibold"
                : ""
            )}
          >
            {labels.all} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "pb-1 font-medium transition-colors hover:text-foreground",
              filter === "unread"
                ? "border-b-2 border-primary text-foreground font-semibold"
                : ""
            )}
          >
            {labels.unread} ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {labels.empty}
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/40",
                  !n.isRead ? "bg-primary/5 dark:bg-primary/10" : ""
                )}
              >
                <div className="mt-0.5">{getCategoryIcon(n.category)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    {n.href ? (
                      <button type="button" onClick={() => follow(n)} className="truncate text-start text-xs font-semibold text-foreground hover:text-primary hover:underline">
                        {n.title}
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {n.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => toggleRead(n.id)}
                    title={n.isRead ? labels.markUnread : labels.markRead}
                    aria-label={n.isRead ? labels.markUnread : labels.markRead}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  >
                    <Check className={cn("size-3.5", n.isRead ? "text-primary" : "opacity-40")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNotification(n.id)}
                    title={labels.dismiss}
                    aria-label={labels.dismiss}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
