"use client"

export * from "@/components/ui/sidebar"

export const Header = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <header className={`flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 px-6 backdrop-blur-md ${className}`} {...props}>
    {children}
  </header>
)

export const HeaderName = ({ prefix = "", children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement> & { prefix?: string }) => (
  <div className={`flex items-center gap-2 font-semibold text-foreground ${className}`} {...props}>
    {prefix && <span className="text-muted-foreground">{prefix}</span>}
    <span>{children}</span>
  </div>
)

export const HeaderGlobalBar = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`ml-auto flex items-center gap-2 ${className}`} {...props}>{children}</div>
)

export const HeaderGlobalAction = ({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={`inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground ${className}`} {...props}>
    {children}
  </button>
)

export const SideNav = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav className={`w-64 border-r border-border/60 bg-card p-3 ${className}`} {...props}>{children}</nav>
)

export const SideNavItems = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col gap-1 ${className}`} {...props}>{children}</div>
)

export const SideNavLink = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/60 ${className}`} {...props}>{children}</div>
)

export const Content = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <main className={`flex-1 overflow-auto p-6 ${className}`} {...props}>{children}</main>
)
