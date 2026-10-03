"use client"

import * as React from "react"
import {
  CheckCircle as CheckmarkFilled,
  AlertCircle as WarningFilled,
  Info as InformationFilled,
  XCircle as ErrorFilled,
  X as Close,
} from "@/components/ui/carbon/icons"
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
    border: "border-destructive/20",
    bg: "bg-danger-soft",
    iconColor: "text-danger-foreground",
    titleColor: "text-danger-foreground font-semibold",
    subtitleColor: "text-danger-foreground",
  },
  warning: {
    icon: WarningFilled,
    border: "border-warning/20",
    bg: "bg-warning-soft",
    iconColor: "text-warning-foreground",
    titleColor: "text-warning-foreground font-semibold",
    subtitleColor: "text-warning-foreground",
  },
  "warning-alt": {
    icon: WarningFilled,
    border: "border-warning/20",
    bg: "bg-warning-soft",
    iconColor: "text-warning-foreground",
    titleColor: "text-warning-foreground font-semibold",
    subtitleColor: "text-warning-foreground",
  },
  success: {
    icon: CheckmarkFilled,
    border: "border-success/20",
    bg: "bg-success-soft",
    iconColor: "text-success-foreground",
    titleColor: "text-success-foreground font-semibold",
    subtitleColor: "text-success-foreground",
  },
  info: {
    icon: InformationFilled,
    border: "border-primary/20",
    bg: "bg-info-soft",
    iconColor: "text-info-foreground",
    titleColor: "text-info-foreground font-semibold",
    subtitleColor: "text-info-foreground",
  },
  "info-square": {
    icon: InformationFilled,
    border: "border-primary/20",
    bg: "bg-info-soft",
    iconColor: "text-info-foreground",
    titleColor: "text-info-foreground font-semibold",
    subtitleColor: "text-info-foreground",
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
