"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ChevronRight } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { useDashboardNav } from "./navigation/use-dashboard-nav"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { PageGuide, guideKeyFor } from "./page-guide"
import { NexusPattern, ObjectTile, type ObjectKind } from "@/components/ui/nexus"

interface PageHeaderProps {
  /** Defaults to the current page's navigation title */
  title?: React.ReactNode
  /** Defaults to the current page's description */
  description?: React.ReactNode
  /** Kind of record this page is about: shows its object tile before the title */
  object?: ObjectKind
  /** Small status pill next to the title */
  badge?: React.ReactNode
  /** Buttons on the right (stacked under the title on small screens) */
  actions?: React.ReactNode
  /** Extra content inside the panel, under the title row */
  children?: React.ReactNode
  className?: string
}

/**
 * Page hero panel: breadcrumb, large title, one-line description and actions,
 * on a white rounded panel like the rest of the design system.
 */
export function PageHeader({ title, description, object, badge, actions, children, className }: PageHeaderProps) {
  const t = useTranslations()
  const { activeGroup, activeItem } = useDashboardNav()
  const { authedUser } = useAuthGuard()
  const isClient = !!(authedUser as { clientId?: string } | undefined)?.clientId

  const resolvedTitle = title ?? activeItem?.title
  const resolvedDescription =
    description ?? (activeItem ? t(activeItem.descriptionKey) : undefined)
  const showGroupCrumb = activeGroup && activeItem && activeGroup.title !== activeItem.title

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-panel sm:p-6 md:px-7",
        className
      )}
    >
      {/* DS-07: the area's node pattern fades in from the end of the panel */}
      <div aria-hidden className="absolute inset-y-0 end-0 -z-10 hidden w-1/2 max-w-xl sm:block">
        <NexusPattern className="text-area opacity-[0.16] dark:opacity-25" />
      </div>
      <span aria-hidden className="absolute inset-y-6 start-0 w-[3px] rounded-e-full bg-area" />
      {activeItem && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {showGroupCrumb && (
            <>
              <span className="font-medium text-area-foreground">{activeGroup.title}</span>
              <ChevronRight className="size-3.5" />
            </>
          )}
          <span className="text-foreground/70">{activeItem.title}</span>
        </nav>
      )}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {object && <ObjectTile kind={object} size="md" />}
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] md:leading-9">
              {resolvedTitle}
            </h1>
            {badge}
          </div>
          {resolvedDescription && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{resolvedDescription}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {activeItem && <PageGuide guideKey={guideKeyFor(activeItem.url, isClient)} />}
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
