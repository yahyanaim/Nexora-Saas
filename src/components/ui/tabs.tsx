"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type TabItem = {
  id: string
  label?: string
  icon?: React.ReactNode
  content?: React.ReactNode
  disabled?: boolean
  onClick?: (tab: TabItem) => void
}

export type TabsProps = {
  tabs: TabItem[]
  defaultTabId?: string
  onChange?: (tab: TabItem) => void
  containerClassName?: string
  activeTabClassName?: string
  tabClassName?: string
  labelClassName?: string
  contentClassName?: string
  animateContent?: boolean
  instanceId?: string
}

export function Tabs({
  tabs,
  defaultTabId,
  onChange,
  containerClassName,
  tabClassName,
  contentClassName,
}: TabsProps) {
  const initialIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === defaultTabId)
  )
  const [selectedIndex, setSelectedIndex] = React.useState(initialIndex)

  const handleTabClick = (tab: TabItem, index: number) => {
    if (tab.disabled) return
    setSelectedIndex(index)
    tab.onClick?.(tab)
    onChange?.(tab)
  }

  const baseId = React.useId()
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  // arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabled = tabs.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0)
    const pos = enabled.indexOf(index)
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl"
    const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowLeft" ? (rtl ? 1 : -1) : 0
    let target: number | undefined
    if (step) target = enabled[(pos + step + enabled.length) % enabled.length]
    else if (e.key === "Home") target = enabled[0]
    else if (e.key === "End") target = enabled[enabled.length - 1]
    const tab = target === undefined ? undefined : tabs[target]
    if (target === undefined || !tab) return
    e.preventDefault()
    handleTabClick(tab, target)
    tabRefs.current[target]?.focus()
  }

  return (
    <div className={cn("flex flex-col w-full", containerClassName)}>
      <div role="tablist" className="flex items-center gap-1 p-1 rounded-full bg-muted w-fit overflow-x-auto max-w-full">
        {tabs.map((tab, idx) => {
          const isSelected = idx === selectedIndex
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[idx] = el }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${idx}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-all duration-150 whitespace-nowrap select-none cursor-pointer",
                isSelected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                tab.disabled && "opacity-50 cursor-not-allowed",
                tabClassName
              )}
            >
              {tab.icon && <span className="size-4 shrink-0">{tab.icon}</span>}
              {tab.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${selectedIndex}`} className={cn("pt-4", contentClassName)}>
        {tabs[selectedIndex]?.content}
      </div>
    </div>
  )
}

export function TabList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("inline-flex items-center gap-1 p-1 rounded-full bg-muted", className)} {...props} />
}

export function Tab({ className, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-all select-none",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TabPanels({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-4", className)} {...props} />
}

export function TabPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full", className)} {...props} />
}
