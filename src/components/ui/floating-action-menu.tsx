"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Plus, Minus } from "lucide-react"

export type MenuDirection =
  "up" | "down" | "left" | "right" | "radial3" | "radial2" | "radial4"

export type TooltipDirection = "top" | "bottom" | "left" | "right"
export type TooltipTrigger = "hover" | "always" | "open"

export type MenuVariant =
  "default" | "secondary" | "destructive" | "accent" | "muted"

export interface MenuItem {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  variant?: MenuVariant
  disabled?: boolean
  className?: string
  tooltipDirection?: TooltipDirection
  tooltipTrigger?: TooltipTrigger
}

export interface FloatingActionMenuProps {
  items: MenuItem[]
  trigger?: React.ReactNode
  triggerVariant?: MenuVariant
  direction?: MenuDirection
  spacing?: number
  className?: string
  triggerClassName?: string
  itemsClassName?: string
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  open?: boolean
  onOpenChangeControlled?: (open: boolean) => void
  size?: "sm" | "md" | "lg"
  closeOnItemClick?: boolean
  closeOnClickOutside?: boolean
  tooltipDirection?: TooltipDirection
  tooltipTrigger?: TooltipTrigger
}

const variantStyles: Record<MenuVariant, string> = {
  default:
    "bg-primary text-primary-foreground border-primary hover:opacity-70 shadow-lg shadow-primary/20",
  secondary:
    "bg-secondary text-secondary-foreground border-secondary hover:opacity-70 shadow-lg shadow-secondary/20",
  destructive:
    "bg-destructive text-destructive-foreground border-destructive hover:opacity-70 shadow-lg shadow-destructive/20",
  accent:
    "bg-accent text-accent-foreground border-accent hover:opacity-70 shadow-lg shadow-accent/20",
  muted:
    "bg-muted text-muted-foreground border-muted hover:opacity-70 shadow-lg",
}

const itemVariantStyles: Record<MenuVariant, string> = {
  default:
    "bg-primary text-primary-foreground border-primary/20 hover:opacity-70",
  secondary:
    "bg-secondary text-secondary-foreground border-secondary/20 hover:opacity-70",
  destructive:
    "bg-destructive text-destructive-foreground border-destructive/20 hover:opacity-70",
  accent: "bg-accent text-accent-foreground border-accent/20 hover:opacity-70",
  muted: "bg-muted text-muted-foreground border-muted/20 hover:opacity-70",
}

const sizeStyles = {
  sm: {
    trigger: "h-9 w-9 md:h-10 md:w-10",
    item: "h-8 w-8 md:h-9 md:w-9",
    icon: "size-3.5 md:size-4",
  },
  md: {
    trigger: "h-11 w-11",
    item: "h-11 w-11 md:h-12 md:w-12",
    icon: "size-4 md:size-5",
  },
  lg: {
    trigger: "h-13 w-13 md:h-16 md:w-16",
    item: "h-11 w-11 md:h-14 md:w-14",
    icon: "size-5 md:size-6",
  },
}

function getItemPosition(
  index: number,
  total: number,
  direction: MenuDirection,
  spacing: number
) {
  switch (direction) {
    case "up":
      return { x: 0, y: -(index + 1) * spacing }
    case "down":
      return { x: 0, y: (index + 1) * spacing }
    case "left":
      return { x: -(index + 1) * spacing, y: 0 }
    case "right":
      return { x: (index + 1) * spacing, y: 0 }
    case "radial4": {
      const angleStep = total > 1 ? Math.PI / 2 / (total - 1.7) : 0
      const angle = Math.PI + index * angleStep
      const radius = spacing * 1.5
      return {
        x: Math.cos(angle - 0.4) * radius,
        y: Math.sin(angle - 0.4) * radius,
      }
    }
    case "radial2": {
      const angleStep = total > 1 ? Math.PI / 2 / (total - 4) : 0
      const angle = Math.PI + index * angleStep
      const radius = spacing * 1.5
      return {
        x: Math.cos(angle + 1.4) * radius,
        y: Math.sin(angle + 1.4) * radius,
      }
    }
    case "radial3": {
      const angleStep = total > 1 ? Math.PI / 2 / (total - 0.8) : 0
      const angle = Math.PI + index * angleStep
      const radius = spacing * 1.5
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    }
    default:
      return { x: 0, y: 0 }
  }
}

function getTooltipStyles(tooltipDir: TooltipDirection, variant: MenuVariant) {
  const base =
    "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-xl backdrop-blur-md border border-white/10"

  const positionMap: Record<TooltipDirection, string> = {
    top: "bottom-full mb-2.5 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2.5 left-1/2 -translate-x-1/2",
    left: "right-full mr-2.5 top-1/2 -translate-y-1/2",
    right: "left-full ml-2.5 top-1/2 -translate-y-1/2",
  }

  const arrowMap: Record<TooltipDirection, string> = {
    top: "-bottom-1 left-1/2 -translate-x-1/2 rotate-[225deg] border-l border-b",
    bottom: "-top-1 left-1/2 -translate-x-1/2 rotate-45 border-l border-t",
    left: "-right-1 top-1/2 -translate-y-1/2 rotate-[135deg] border-b border-l",
    right: "-left-1 top-1/2 -translate-y-1/2 rotate-[315deg] border-t border-r",
  }

  const bgMap: Record<MenuVariant, string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    accent: "bg-accent text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  }

  const arrowBgMap: Record<MenuVariant, string> = {
    default: "bg-primary",
    secondary: "bg-secondary",
    destructive: "bg-destructive",
    accent: "bg-accent",
    muted: "bg-muted",
  }

  return {
    tooltipClass: cn(base, positionMap[tooltipDir], bgMap[variant]),
    arrowClass: cn(
      "absolute h-2 w-2 border-white/10",
      arrowMap[tooltipDir],
      arrowBgMap[variant]
    ),
  }
}

function shouldShowTooltip(
  trigger: TooltipTrigger,
  isOpen: boolean,
  isHovered: boolean
): boolean {
  if (trigger === "always") return true
  if (trigger === "open") return isOpen
  return isHovered
}

export function FloatingActionMenu({
  items,
  trigger,
  triggerVariant = "default",
  direction = "up",
  spacing = 60,
  className,
  triggerClassName,
  itemsClassName,
  onOpenChange,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChangeControlled,
  size = "md",
  closeOnItemClick = true,
  closeOnClickOutside = true,
  tooltipDirection = "left",
  tooltipTrigger = "hover",
}: FloatingActionMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const containerRef = useRef<HTMLDivElement>(null)

  const setOpen = useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(value)
      onOpenChangeControlled?.(value)
      onOpenChange?.(value)
    },
    [controlledOpen, onOpenChangeControlled, onOpenChange]
  )

  const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen])

  useEffect(() => {
    if (!closeOnClickOutside || !isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, closeOnClickOutside, setOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, setOpen])

  const sizes = sizeStyles[size]

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      role="menu"
      aria-expanded={isOpen}
    >
      <AnimatePresence>
        {isOpen && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              itemsClassName
            )}
          >
            {items.map((item, index) => {
              const pos = getItemPosition(
                index,
                items.length,
                direction,
                spacing
              )
              const itemVariant = item.variant || "default"
              const itemTooltipDir = item.tooltipDirection || tooltipDirection
              const itemTooltipTrigger = item.tooltipTrigger || tooltipTrigger
              const isHovered = hoveredIndex === index
              const showTooltip = shouldShowTooltip(
                itemTooltipTrigger,
                isOpen,
                isHovered
              )
              const { tooltipClass, arrowClass } = getTooltipStyles(
                itemTooltipDir,
                itemVariant
              )

              return (
                <motion.button
                  key={index}
                  role="menuitem"
                  aria-label={item.label}
                  initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                  exit={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    item.onClick?.()
                    if (closeOnItemClick) setOpen(false)
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  disabled={item.disabled}
                  className={cn(
                    "pointer-events-auto absolute inset-0 m-2 flex cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
                    sizes.item,
                    itemVariantStyles[itemVariant],
                    item.disabled && "cursor-not-allowed opacity-50",
                    item?.className
                  )}
                >
                  {item.icon}

                  {/* 🔥 Tooltip — direction & trigger controlled */}
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 24,
                          mass: 0.7,
                        }}
                        className={tooltipClass}
                      >
                        {item.label}
                        <span className={arrowClass} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        role="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggle}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative z-10 flex cursor-pointer items-center justify-center rounded-full border-2 font-bold transition-colors",
          sizes.trigger,
          variantStyles[triggerVariant],
          triggerClassName
        )}
      >
        {trigger ||
          (isOpen ? (
            <Minus className={sizes.icon} />
          ) : (
            <Plus className={sizes.icon} />
          ))}
      </motion.button>
    </div>
  )
}
