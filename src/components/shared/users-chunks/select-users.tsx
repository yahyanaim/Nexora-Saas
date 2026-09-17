"use client"

import { useMemo, useState } from "react"
import {
  ChevronsUpDown,
  Loader2,
  Users,
  X,
  Check,
  SearchIcon,
} from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslations } from "next-intl"
import { useUsersOptions } from "@/hooks/users/use-users-options"
import { SpaceAvatar } from "@/components/ui/space-avatar"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  profileColor?: string
}

interface SelectUsersProps {
  value: string[]
  onChange: (userIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  excludeUserId?: string
  maxItems?: number
}

export function SelectUsers({
  value,
  onChange,
  placeholder,
  disabled = false,
  excludeUserId,
  maxItems,
}: SelectUsersProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  const {
    data: users,
    isLoading,
    isFetching,
    search,
    setSearch,
  } = useUsersOptions()

  const placeholderText = placeholder || t("selectUsers")

  // Filter out excluded user
  const filteredUsers = useMemo(() => {
    if (!users) return []
    return excludeUserId
      ? users.filter((user) => user.id !== excludeUserId)
      : users
  }, [users, excludeUserId])

  // Selected users with full data
  const selectedUsers = useMemo(() => {
    if (!users || !value.length) return []
    return value
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean) as User[]
  }, [value, users])

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId))
    } else {
      if (maxItems && value.length >= maxItems) {
        return
      }
      onChange([...value, userId])
    }
  }

  const removeUser = (userId: string) => {
    onChange(value.filter((id) => id !== userId))
  }

  const clearAll = () => {
    onChange([])
  }

  const isSelected = (userId: string) => value.includes(userId)

  const allSelectedCount = value.length
  const hasSelection = allSelectedCount > 0

  // Trigger content: chips or placeholder
  const renderTriggerContent = () => {
    if (isLoading && !hasSelection) {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loadingUsers")}
        </span>
      )
    }

    if (!hasSelection) {
      return <span className="text-muted-foreground">{placeholderText}</span>
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedUsers.slice(0, 3).map((user) => (
          <Badge
            key={user.id}
            variant="secondary"
            className="gap-1 pr-1 font-medium hover:bg-secondary"
          >
            {user.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                removeUser(user.id)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  removeUser(user.id)
                }
              }}
              className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={t("removeUser", { name: user.name })}
            >
              <X className="size-3" />
            </span>
          </Badge>
        ))}
        {allSelectedCount > 3 && (
          <Badge variant="outline" className="font-medium">
            {t("more", { count: allSelectedCount - 3 })}
          </Badge>
        )}
        {maxItems && allSelectedCount >= maxItems && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {t("maxReached")}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls="users-listbox"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "flex h-auto min-h-[52px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors",
            "hover:bg-accent/50",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
            disabled && "pointer-events-none cursor-not-allowed opacity-50"
          )}
        >
          {renderTriggerContent()}
          <div className="flex shrink-0 items-center gap-1.5">
            {hasSelection && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  clearAll()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    clearAll()
                  }
                }}
                className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={t("clearAllUsers")}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] rounded-xl p-0 shadow-xl"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col rounded-xl">
          {/* Header with count */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span className="text-sm font-semibold">
                {t("users")} {users?.length}
              </span>
            </div>
            {hasSelection && (
              <span className="text-xs text-muted-foreground">
                {t("selectedCount", { count: allSelectedCount })}
                {maxItems && ` / ${maxItems}`}
              </span>
            )}
          </div>

          {/* Plain search input instead of CommandInput */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchUsers")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Plain scrollable list — overflow-auto works here, nothing intercepts it */}
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto p-1"
          >
            {isLoading || (isFetching && search) ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {search ? t("searching") : t("loadingUsers")}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">{t("noUsersFound")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("tryAdjustingSearch")}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const checked = isSelected(user.id)
                const isDisabled = Boolean(
                  maxItems && !checked && value.length >= maxItems
                )
                return (
                  <div
                    key={user.id}
                    role="option"
                    aria-selected={checked}
                    aria-disabled={isDisabled}
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => {
                      if (!isDisabled) toggleUser(user.id)
                    }}
                    onKeyDown={(e) => {
                      if (isDisabled) return
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleUser(user.id)
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 outline-none",
                      "hover:bg-accent focus-visible:bg-accent",
                      checked && "bg-primary/5",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <SpaceAvatar
                      name={user.name}
                      profileColor={user.profileColor}
                      src={user.avatar}
                      size="xs"
                    />
                    <div className="flex flex-1 flex-col truncate">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 transition-opacity",
                        checked ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {isDisabled && (
                      <span className="text-xs text-muted-foreground">
                        {t("maxReached")}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
