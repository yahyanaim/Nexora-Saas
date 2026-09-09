"use client"

import { MouseEvent, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ShieldCheck } from "lucide-react"
import {
  PERMISSION_GROUPS,
  AdminPermissionsPlatform,
  RESOURCE_ICONS,
} from "@/types/roles"
import { useTranslations } from "next-intl"

export function PermissionsSelector({
  value,
  onChange,
}: {
  value: AdminPermissionsPlatform[]
  onChange: (permissions: AdminPermissionsPlatform[]) => void
}) {
  const t = useTranslations()
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    PERMISSION_GROUPS.filter((group) =>
      group.permissions.some((p) => value.includes(p.value))
    ).map((g) => g.resource)
  )

  const toggle = (permission: AdminPermissionsPlatform) => {
    onChange(
      value.includes(permission)
        ? value.filter((p) => p !== permission)
        : [...value, permission]
    )
  }

  const toggleGroup = (
    groupPermissions: AdminPermissionsPlatform[],
    checked: boolean
  ) => {
    onChange(
      checked
        ? Array.from(new Set([...value, ...groupPermissions]))
        : value.filter((p) => !groupPermissions.includes(p))
    )
  }

  return (
    <Accordion
      type="multiple"
      value={openGroups}
      onValueChange={setOpenGroups}
      className="w-full space-y-2"
    >
      {PERMISSION_GROUPS.map((group) => {
        const groupValues = group.permissions.map((p) => p.value)
        const selectedCount = groupValues.filter((p) =>
          value.includes(p)
        ).length
        const allChecked =
          selectedCount === groupValues.length && groupValues.length > 0
        const someChecked = selectedCount > 0 && !allChecked
        const Icon = RESOURCE_ICONS[group.resource]
        const isOpen = openGroups.includes(group.resource)

        // Handle "Select all" click without triggering accordion
        const handleSelectAllClick = (e: MouseEvent) => {
          e.stopPropagation()
        }

        return (
          <AccordionItem
            key={group.resource}
            value={group.resource}
            className={cn(
              "group overflow-hidden rounded-xl border bg-background shadow-sm transition-all duration-200",
              isOpen && "shadow-md ring-1 ring-primary/10"
            )}
          >
            <AccordionTrigger className="px-4 py-3.5 hover:no-underline [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200">
              <div className="flex flex-1 items-center gap-3">
                <div onClick={handleSelectAllClick}>
                  <Checkbox
                    checked={
                      allChecked ? true : someChecked ? "indeterminate" : false
                    }
                    onCheckedChange={(checked) =>
                      toggleGroup(groupValues, checked === true)
                    }
                    className="size-5"
                  />
                </div>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    selectedCount > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                </div>

                <span className="text-sm font-semibold text-foreground">
                  {group.label}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <Badge
                    variant={selectedCount > 0 ? "default" : "secondary"}
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium tabular-nums",
                      selectedCount === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {selectedCount}/{groupValues.length}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {/* Permission checkboxes grid */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {group.permissions.map((permission) => {
                  const checked = value.includes(permission.value)
                  return (
                    <label
                      key={permission.value}
                      className={cn(
                        "flex grow cursor-pointer items-center justify-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all duration-150",
                        "hover:border-primary/30",
                        checked
                          ? "border-primary/40 bg-primary/15 shadow-sm"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(permission.value)}
                        className={cn(
                          "size-4 transition-transform",
                          checked && "scale-110"
                        )}
                      />
                      <span
                        className={cn(
                          "truncate font-medium transition-colors",
                          checked ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {permission.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
