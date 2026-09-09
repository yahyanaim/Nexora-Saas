"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

export interface ProfileHeaderProps {
  patternColor?: string
  renderBackground?: React.ReactNode
  titleIcon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  children?: React.ReactNode
  height?: string
  className?: string
  contentClassName?: string
}

export const ProfileHeader = memo(function ProfileHeader({
  patternColor,
  renderBackground,
  titleIcon,
  title,
  subtitle,
  children,
  height = "h-35",
  className,
  contentClassName,
}: ProfileHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md p-6 pb-10 text-primary-foreground",
        height,
        className
      )}
    >
      {renderBackground ? (
        <div className="absolute inset-0">{renderBackground}</div>
      ) : patternColor ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${patternColor} 0%, ${patternColor}dd 100%)`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
      )}

      <div className={cn("relative z-10", contentClassName)}>
        <div className="flex items-center gap-2">
          {titleIcon}
          <p className="text-xl font-bold text-primary-foreground">{title}</p>
        </div>
        {subtitle && (
          <p className="text-sm text-primary-foreground/80">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  )
})

export default ProfileHeader
