"use client"

import * as React from "react"
import {
  CheckmarkFilled,
  WarningFilled,
  InformationFilled,
  ErrorFilled,
  Close,
} from "@carbon/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type NotificationKind =
  | "error"
  | "warning"
  | "warning-alt"
  | "success"
  | "info"
  | "info-square"

export interface NotificationProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  kind?: NotificationKind
  title?: React.ReactNode
  subtitle?: React.ReactNode
  lowContrast?: boolean
  hideCloseButton?: boolean
  onCloseButtonClick?: () => void
  onClose?: () => void
  actionButtonLabel?: string
  onActionButtonClick?: () => void
  children?: React.ReactNode
}

const kindConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    border: string
    bg: string
    iconColor: string
    titleColor: string
    subtitleColor: string
  }
> = {
  error: {
    icon: ErrorFilled,
    border: "border-red-500/30 dark:border-rose-500/30",
    bg: "bg-red-50 dark:bg-rose-950/40",
    iconColor: "text-red-600 dark:text-rose-400",
    titleColor: "text-red-900 dark:text-rose-100 font-semibold",
    subtitleColor: "text-red-800 dark:text-rose-200/90",
  },
  warning: {
    icon: WarningFilled,
    border: "border-amber-500/30 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-900 dark:text-amber-100 font-semibold",
    subtitleColor: "text-amber-800 dark:text-amber-200/90",
  },
  "warning-alt": {
    icon: WarningFilled,
    border: "border-amber-500/30 dark:border-amber-500/30",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-900 dark:text-amber-100 font-semibold",
    subtitleColor: "text-amber-800 dark:text-amber-200/90",
  },
  success: {
    icon: CheckmarkFilled,
    border: "border-emerald-500/30 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-900 dark:text-emerald-100 font-semibold",
    subtitleColor: "text-emerald-800 dark:text-emerald-200/90",
  },
  info: {
    icon: InformationFilled,
    border: "border-blue-500/30 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-900 dark:text-blue-100 font-semibold",
    subtitleColor: "text-blue-800 dark:text-blue-200/90",
  },
  "info-square": {
    icon: InformationFilled,
    border: "border-blue-500/30 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-900 dark:text-blue-100 font-semibold",
    subtitleColor: "text-blue-800 dark:text-blue-200/90",
  },
}

export function InlineNotification({
  kind = "info",
  title,
  subtitle,
  hideCloseButton = false,
  onCloseButtonClick,
  onClose,
  actionButtonLabel,
  onActionButtonClick,
  className,
  children,
  ...props
}: NotificationProps) {
  const [closed, setClosed] = React.useState(false)
  if (closed) return null

  const defaultCfg = kindConfig["info"]!
  const cfg = kindConfig[kind] || defaultCfg
  const Icon = cfg.icon

  const handleClose = () => {
    setClosed(true)
    onCloseButtonClick?.()
    onClose?.()
  }

  return (
    <div
      role="alert"
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl border p-4 shadow-xs backdrop-blur-xs transition-all",
        cfg.border,
        cfg.bg,
        className
      )}
      {...props}
    >
      <Icon className={cn("size-5 shrink-0 mt-0.5", cfg.iconColor)} />

      <div className="flex-1 min-w-0 text-sm">
        {title && (
          <div className={cn("font-semibold tracking-tight", cfg.titleColor)}>
            {title}
          </div>
        )}
        {subtitle && (
          <div className={cn("mt-0.5 leading-relaxed font-normal", cfg.subtitleColor)}>
            {subtitle}
          </div>
        )}
        {children && <div className="mt-1">{children}</div>}

        {actionButtonLabel && onActionButtonClick && (
          <div className="mt-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={onActionButtonClick}
              className="h-7 text-xs bg-background hover:bg-background/90 text-foreground font-medium border-border/80 shadow-xs"
            >
              {actionButtonLabel}
            </Button>
          </div>
        )}
      </div>

      {!hideCloseButton && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 -mt-1 rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
        >
          <Close className="size-4" />
        </button>
      )}
    </div>
  )
}

export const ActionableNotification = InlineNotification
export const ToastNotification = InlineNotification

export interface NotificationBannerProps {
  kind: NotificationKind
  title: string
  subtitle?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
  lowContrast?: boolean
  hideCloseButton?: boolean
  className?: string
}

export function NotificationBanner({
  kind,
  title,
  subtitle,
  actionLabel,
  onAction,
  onClose,
  hideCloseButton = false,
  className = "",
}: NotificationBannerProps) {
  return (
    <InlineNotification
      kind={kind}
      title={title}
      subtitle={subtitle}
      actionButtonLabel={actionLabel}
      onActionButtonClick={onAction}
      onClose={onClose}
      hideCloseButton={hideCloseButton}
      className={className}
    />
  )
}
