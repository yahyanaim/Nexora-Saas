"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronsUpDown,
  Loader2,
  SearchIcon,
  ShieldCheck,
  X,
} from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRolesOptions } from "@/hooks/roles/use-roles-options"
import { useTranslations } from "next-intl"

interface RoleOption {
  id: string
  name: string
}

export function RolesMultiSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (roleIds: string[]) => void
  placeholder?: string
}) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [selectedNames, setSelectedNames] = useState<Record<string, string>>({})
  const {
    data: roles,
    isLoading,
    isFetching,
    search,
    setSearch,
  } = useRolesOptions()

  // Use translated placeholder if not provided
  const placeholderText = placeholder || t("selectRoles")

  // Sync selected names with the current roles list
  useEffect(() => {
    if (!roles?.length) return
    queueMicrotask(() => {
      setSelectedNames((prev) => {
        const next = { ...prev }
        roles.forEach((role: RoleOption) => {
          next[role?.id] = role?.name
        })
        return next
      })
    })
  }, [roles])

  // Build selected roles with names, deduplicate
  const selectedRoles = useMemo(
    () =>
      value
        .map((id) => ({
          id,
          name:
            selectedNames[id] ?? roles?.find((r) => r.id === id)?.name ?? id,
        }))
        .filter(
          (role, index, self) =>
            self.findIndex((r) => r.id === role?.id) === index
        ),
    [value, selectedNames, roles]
  )

  const allSelectedCount = selectedRoles.length
  const hasSelection = allSelectedCount > 0

  const toggle = (roleId: string, roleName: string) => {
    setSelectedNames((prev) => ({ ...prev, [roleId]: roleName }))
    onChange(
      value.includes(roleId)
        ? value.filter((id) => id !== roleId)
        : [...value, roleId]
    )
  }

  const remove = (roleId: string) => {
    onChange(value.filter((id) => id !== roleId))
  }

  const clearAll = () => {
    onChange([])
  }

  // Trigger content: chips or placeholder
  const renderTriggerContent = () => {
    if (isLoading && !hasSelection) {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loadingRoles")}
        </span>
      )
    }

    if (!hasSelection) {
      return <span className="text-muted-foreground">{placeholderText}</span>
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedRoles.slice(0, 3).map((role) => (
          <Badge
            key={role?.id}
            variant="secondary"
            className="gap-1 pr-1 font-medium hover:bg-secondary"
          >
            {role?.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                remove(role?.id)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  remove(role?.id)
                }
              }}
              className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={t("removeRole", { name: role?.name })}
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
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls="roles-listbox"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "flex h-auto min-h-[52px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-normal shadow-sm transition-colors",
            "hover:bg-accent/50",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
            // hasSelection && "border-primary/30 bg-primary/5 hover:bg-primary/10"
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
                aria-label={t("clearAllRoles")}
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
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-sm font-semibold">{t("roles")}</span>
            </div>
            {hasSelection && (
              <span className="text-xs text-muted-foreground">
                {t("selectedCount", { count: allSelectedCount })}
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
              placeholder={t("searchRoles")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Plain scrollable list — overflow works fine, no cmdk involved */}
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto p-1"
          >
            {isLoading || (isFetching && search) ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {search ? t("searching") : t("loadingRoles")}
              </div>
            ) : !roles || roles.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShieldCheck className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">{t("noRolesFound")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("tryAdjustingSearch")}
                </p>
              </div>
            ) : (
              roles.map((role: RoleOption) => {
                const checked = value.includes(role?.id)
                return (
                  <div
                    key={role?.id}
                    role="option"
                    aria-selected={checked}
                    tabIndex={0}
                    onClick={() => toggle(role?.id, role?.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggle(role?.id, role?.name)
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 outline-none",
                      "hover:bg-accent focus-visible:bg-accent",
                      checked && "bg-primary/5"
                    )}
                  >
                    <ShieldCheck
                      className={cn(
                        "size-4 shrink-0",
                        checked ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="flex-1 truncate font-medium">
                      {role?.name}
                    </span>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 transition-opacity",
                        checked ? "opacity-100" : "opacity-0"
                      )}
                    />
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
