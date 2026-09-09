"use client"
import { useState, useCallback, useRef, useLayoutEffect } from "react"
import { motion } from "motion/react"
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
  activeTabClassName,
  tabClassName,
  labelClassName,
  contentClassName,
  animateContent = true,
  instanceId = "default",
}: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId)
  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0]
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const scrollTabIntoView = useCallback((tabId: string) => {
    const container = scrollContainerRef.current
    const tabEl = tabRefs.current[tabId]
    if (!container || !tabEl) return

    const containerWidth = container.offsetWidth
    const scrollLeft = container.scrollLeft
    const tabLeft = tabEl.offsetLeft
    const tabWidth = tabEl.offsetWidth

    const targetScroll = tabLeft - containerWidth / 2 + tabWidth / 2

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    })
  }, [])

  const handleClick = useCallback(
    (tab: TabItem) => {
      if (tab.disabled) return
      tab.onClick?.(tab)
      setActiveId(tab.id)
      onChange?.(tab)
      scrollTabIntoView(tab.id)
    },
    [onChange, scrollTabIntoView]
  )

  // Scroll to default active tab on mount
  useLayoutEffect(() => {
    const id = activeId ?? tabs[0]?.id
    if (!id) return

    // rAF ensures the browser has painted and refs are populated
    const raf = requestAnimationFrame(() => {
      scrollTabIntoView(id)
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col">
      {tabs?.length > 1 && (
        <div
          ref={scrollContainerRef}
          role="tablist"
          className={cn(
            "relative flex w-full items-center -space-x-1 overflow-x-auto overflow-y-hidden rounded-4xl bg-card p-1 md:-space-x-2",
            // Hide scrollbar cross-browser
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            containerClassName
          )}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeId
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el
                }}
                role="tab"
                aria-selected={isActive}
                disabled={tab.disabled}
                onClick={() => handleClick(tab)}
                className={cn(
                  "relative flex shrink-0 grow items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors md:gap-1.5 md:px-4 md:py-2.5",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  tab.disabled && "cursor-not-allowed opacity-50",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                  tabClassName
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={`active-tab-bg-${instanceId}`}
                    transition={{
                      type: "spring",
                      bounce: 0.2,
                      duration: 0.5,
                    }}
                    className={cn(
                      "absolute inset-0 rounded-full bg-primary/10",
                      activeTabClassName
                    )}
                  />
                )}
                {tab.icon && <span className="relative z-10">{tab.icon}</span>}
                {tab.label && (
                  <span
                    className={cn(
                      "relative z-10 text-[13px] whitespace-nowrap md:text-sm",
                      labelClassName
                    )}
                  >
                    {tab.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {activeTab?.content && (
        <div className={cn("relative mt-2 px-2", contentClassName)}>
          {animateContent ? (
            <div key={activeId}>{activeTab?.content}</div>
          ) : (
            <div key={activeId}>{activeTab?.content}</div>
          )}
        </div>
      )}
    </div>
  )
}
