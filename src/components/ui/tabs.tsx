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

  return (
    <div className={cn("flex flex-col w-full", containerClassName)}>
      <div className="flex items-center gap-1 p-1 rounded-full bg-muted w-fit overflow-x-auto max-w-full">
        {tabs.map((tab, idx) => {
          const isSelected = idx === selectedIndex
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab, idx)}
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
      <div className={cn("pt-4", contentClassName)}>
        {tabs[selectedIndex]?.content}
      </div>
    </div>
  )
}

export function TabList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center gap-1 p-1 rounded-full bg-muted", className)} {...props} />
}

export function Tab({ className, active, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
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
