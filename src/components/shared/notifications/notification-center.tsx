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

export interface NotificationItem {
  id: string
  title: string
  message: string
  category: "security" | "billing" | "team" | "system"
  timestamp: string
  isRead: boolean
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
export function NotificationCenter() {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getCategoryIcon = (category: NotificationItem["category"]) => {
    switch (category) {
      case "security":
        return <ShieldAlert className="size-4 text-destructive shrink-0" />
      case "billing":
        return <CreditCard className="size-4 text-emerald-500 shrink-0" />
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
          className="relative inline-flex size-9 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          aria-label="Open notifications"
          type="button"
        >
          <Bell className="size-4 pointer-events-none" />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50">
              {unreadCount}
            </span>
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
              Notifications
            </h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {unreadCount} new
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
              <Check className="mr-1 size-3" />
              Mark all read
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
            All ({notifications.length})
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
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No notifications to display.
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
                    <p className="text-xs font-semibold text-foreground truncate">
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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
                    title={n.isRead ? "Mark as unread" : "Mark as read"}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  >
                    <Check className={cn("size-3.5", n.isRead ? "text-primary" : "opacity-40")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNotification(n.id)}
                    title="Dismiss"
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
