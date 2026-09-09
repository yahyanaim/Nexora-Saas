"use client"

import {
  Avatar as ShadcnAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Megaphone, Network, User as UserIcon, Users } from "lucide-react"

import { avatarSizeConfig } from "./avatar-uploader"
import { useLocale } from "next-intl"
import { getDirection } from "@/lib/utils/get-direction"

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

interface SpaceAvatarProps {
  src?: string
  profileColor?: string
  name: string
  className?: string
  isOnline?: boolean
  fallbackClassName?: string
  charClassName?: string
  onClick?: () => void
  size?: AvatarSize
  showStackCommunity?: boolean
  userId?: string
  isActiveCall?: boolean
  theyBlockedMe?: boolean
}

export function SpaceAvatar({
  src,
  name,
  className,
  fallbackClassName,
  profileColor,
  charClassName,
  onClick = () => false,
  size = "sm",
  showStackCommunity = true,
  theyBlockedMe,
}: SpaceAvatarProps) {
  const locale = useLocale()
  const dir = getDirection(locale)
  const char = name?.slice(0, 2).toUpperCase()
  const isGroup = false
  const isChannel = false
  const isCommunity = false
  const config = avatarSizeConfig[size]

  return (
    <div onClick={onClick} className="relative inline-flex shrink-0">
      <ShadcnAvatar className={cn("shrink-0", config.avatar, className)}>
        <AvatarImage
          className="z-10"
          src={theyBlockedMe ? undefined : src || undefined}
          alt={name}
        />
        <AvatarFallback
          className={cn(
            "z-10 font-bold text-white",
            config.text,
            fallbackClassName
          )}
          style={{
            background: profileColor ? profileColor : "var(--primary)",
          }}
        >
          {isGroup ? (
            <Users className={cn("text-white", config.icon)} />
          ) : isChannel ? (
            <Megaphone className={cn("text-white", config.icon)} />
          ) : isCommunity ? (
            <Network className={cn("text-white", config.icon)} />
          ) : char ? (
            <span className={cn(config.text, charClassName)}>{char}</span>
          ) : (
            <UserIcon className={cn("text-white", config.icon)} />
          )}
        </AvatarFallback>
      </ShadcnAvatar>
      {showStackCommunity && isCommunity && (
        <>
          <div className="absolute -right-1 -bottom-1 z-0 h-full w-full rounded-full bg-green-500 shadow-md" />
          <div className="absolute bottom-1 -left-2 z-0 h-full w-full rounded-full bg-blue-500 shadow-md" />
          <div className="absolute -bottom-1 -left-1 z-0 h-full w-full rounded-full bg-white shadow-md" />
          <div className="absolute -top-1 left-1 z-0 h-full w-full rounded-full bg-gray-500 shadow-md" />
        </>
      )}
    </div>
  )
}
