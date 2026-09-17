"use client"

import * as React from "react"
import { SidePanelOpen } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  children,
}: {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  return (
    <SidebarContext.Provider
      value={{
        state: open ? "expanded" : "collapsed",
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile: false,
        toggleSidebar,
      }}
    >
      <div
        className={cn(
          "flex h-screen w-full overflow-hidden bg-background text-foreground",
          className
        )}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" }) {
  const { open } = useSidebar()

  return (
    <aside
      className={cn(
        "flex flex-col h-full shrink-0 border-sidebar-border bg-sidebar transition-all duration-200 z-30",
        side === "right" ? "order-last border-l" : "border-r",
        open ? "w-64" : "w-16",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-4 border-b border-sidebar-border flex items-center justify-between shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarGroupContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props}>{children}</div>
}

export function SidebarMenu({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("list-none m-0 p-0 flex flex-col gap-0.5", className)} {...props}>
      {children}
    </ul>
  )
}

export function SidebarMenuItem({
  className,
  children,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("list-none", className)} {...props}>{children}</li>
}

export function SidebarMenuButton({
  asChild,
  isActive,
  size = "default",
  tooltip: _tooltip,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  isActive?: boolean
  size?: "default" | "sm" | "lg" | string
  tooltip?: React.ReactNode
}) {
  const combinedClassName = cn(
    "flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer select-none",
    size === "sm" && "px-2 py-1 text-xs",
    size === "lg" && "px-3 py-2.5 text-sm",
    isActive
      ? "bg-primary/15 text-primary font-semibold shadow-xs"
      : "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
    className
  )

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      className: cn(combinedClassName, child.props.className),
      ...props,
      ...child.props,
    })
  }

  return (
    <button
      type="button"
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-3 border-t border-sidebar-border flex items-center shrink-0 mt-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarRail({
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      type="button"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 right-0 hidden w-1 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-border group-data-[side=left]:-right-4 sm:flex cursor-w-resize",
        className
      )}
      {...props}
    />
  )
}

export function SidebarTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      <SidePanelOpen className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn(
      "relative flex min-h-svh flex-1 flex-col bg-background overflow-y-auto",
      className
    )}
    {...props}
  />
))
SidebarInset.displayName = "SidebarInset"
