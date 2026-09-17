"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface SpaceAvatarProps {
  name?: string
  src?: string
  profileColor?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number
  className?: string
}

export function SpaceAvatar({
  name,
  src,
  profileColor,
  size = "md",
  className,
}: SpaceAvatarProps) {
  const sizeClasses =
    size === "xs"
      ? "size-6 text-[10px]"
      : size === "sm"
      ? "size-8 text-xs"
      : size === "lg"
      ? "size-12 text-sm"
      : size === "xl"
      ? "size-16 text-base"
      : typeof size === "number"
      ? `size-[${size}px]`
      : "size-10 text-xs"

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  return (
    <Avatar className={cn(sizeClasses, className)}>
      {src && <AvatarImage src={src} alt={name || "User"} />}
      <AvatarFallback
        style={profileColor ? { backgroundColor: profileColor, color: "#ffffff" } : undefined}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
