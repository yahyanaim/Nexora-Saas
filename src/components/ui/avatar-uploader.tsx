"use client"

import {
  memo,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react"
import { Upload, Trash, Users, Megaphone, User, Network } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AvatarUploaderHandle {
  chooseImage: () => void
  clearInput: () => void
}

export interface AvatarUploaderProps {
  imageUrl?: string | null
  fallbackText?: string
  fallbackIcon?: React.ReactNode
  renderFallback?: React.ReactNode
  borderColor?: string
  glowColor?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  onImageChange?: (file: File, previewUrl: string) => void
  onImageRemove?: () => void
  accept?: string
  className?: string
  avatarClassName?: string
  showRemoveButton?: boolean
  renderOverlay?: React.ReactNode
  renderRemoveButton?: React.ReactNode
  disabled?: boolean
  showGlow?: boolean
}
export const avatarSizeConfig = {
  xs: {
    avatar: "h-8 w-8",
    text: "text-xs",
    icon: "size-5",
    remove: "h-5 w-5",
    removeIcon: "size-3",
    indicator: "h-2.5 w-2.5",
    ring: "border-[1.5px]",
  },
  sm: {
    avatar: "size-11 md:size-13",
    text: "text-base md:text-lg",
    icon: "size-5 md:size-6",
    remove: "size-5 md:size-6",
    removeIcon: "size-3 md:size-3.5",
    indicator: "size-2.5 md:size-3",
    ring: "border",
  },
  md: {
    avatar: "h-16 w-16 md:h-24 md:w-24",
    text: "text-2xl md:text-3xl",
    icon: "size-8 md:size-10",
    remove: "h-7 w-7 md:h-9 md:w-9",
    removeIcon: "size-4 md:size-5",
    indicator: "h-3.5 w-3.5 md:h-5 md:w-5",
    ring: "border-2",
  },
  lg: {
    avatar: "h-20 w-20 md:h-28 md:w-28",
    text: "text-3xl md:text-4xl",
    icon: "size-10 md:size-15",
    remove: "h-8 w-8 md:h-10 md:w-10",
    removeIcon: "size-4 md:size-5",
    indicator: "h-4 w-4 md:h-6 md:w-6",
    ring: "border-2 md:border-[3px]",
  },
  xl: {
    avatar: "h-24 w-24 md:h-36 md:w-36",
    text: "text-4xl md:text-5xl",
    icon: "size-12 md:size-19",
    remove: "h-9 w-9 md:h-11 md:w-11",
    removeIcon: "size-5 md:size-6",
    indicator: "h-5 w-5 md:h-7 md:w-7",
    ring: "border-2 md:border-[3px]",
  },
} as const
export const AvatarUploader = memo(
  forwardRef<AvatarUploaderHandle, AvatarUploaderProps>(function AvatarUploader(
    {
      imageUrl,
      fallbackText,
      fallbackIcon,
      renderFallback,
      borderColor,
      glowColor,
      size = "md",
      onImageChange,
      onImageRemove,
      accept = "image/*",
      className,
      avatarClassName,
      showRemoveButton = true,
      renderOverlay,
      renderRemoveButton,
      disabled = false,
      showGlow = true,
    },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const config = avatarSizeConfig[size]
    const isPrivate = true
    const isGroup = false
    const isChannel = false
    const isCommunity = false

    useImperativeHandle(ref, () => ({
      chooseImage: () => fileInputRef.current?.click(),
      clearInput: () => {
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
    }))

    const handleChooseImage = useCallback(() => {
      if (!disabled) fileInputRef.current?.click()
    }, [disabled])

    const handleImageChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !file.type.startsWith("image/")) return
        const preview = URL.createObjectURL(file)
        onImageChange?.(file, preview)
      },
      [onImageChange]
    )

    const handleRemove = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (fileInputRef.current) fileInputRef.current.value = ""
        onImageRemove?.()
      },
      [onImageRemove]
    )

    return (
      <div className={cn("relative flex justify-center", className)}>
        <div className={cn("relative", config.avatar)}>
          {showGlow && (
            <div
              className="absolute -inset-1 rounded-full blur-xl transition-all duration-500"
              style={{
                backgroundColor: glowColor || borderColor,
                opacity: 0.3,
              }}
            />
          )}

          <div
            onClick={handleChooseImage}
            className={cn(
              "relative z-10 cursor-pointer overflow-hidden rounded-full border-4 transition-all duration-300",
              config.avatar,
              disabled && "cursor-not-allowed opacity-60",
              avatarClassName
            )}
            style={{ borderColor: borderColor }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : renderFallback ? (
              renderFallback
            ) : fallbackIcon ? (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ backgroundColor: borderColor }}
              >
                {isGroup ? (
                  <Users className={cn("text-white", config.icon)} />
                ) : isChannel ? (
                  <Megaphone className={cn("text-white", config.icon)} />
                ) : isPrivate ? (
                  <User className={cn("text-white", config.icon)} />
                ) : isCommunity ? (
                  <Network className={cn("text-white", config.icon)} />
                ) : (
                  fallbackIcon || (
                    <Upload className={cn("text-white", config.icon)} />
                  )
                )}
              </div>
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ backgroundColor: borderColor }}
              >
                {isGroup ? (
                  <Users className={cn("text-white", config.icon)} />
                ) : isChannel ? (
                  <Megaphone className={cn("text-white", config.icon)} />
                ) : isPrivate ? (
                  <User className={cn("text-white", config.icon)} />
                ) : isCommunity ? (
                  <Network className={cn("text-white", config.icon)} />
                ) : (
                  <span
                    className={cn(
                      "font-bold text-white uppercase",
                      config.text
                    )}
                  >
                    {fallbackText?.slice(0, 2)}
                  </span>
                )}
              </div>
            )}

            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                {renderOverlay || (
                  <Upload className={cn("text-white", config.icon)} />
                )}
              </div>
            )}
          </div>
          {isCommunity && (
            <>
              <div className="absolute -right-1 -bottom-1 z-0 h-full w-full rounded-full bg-green-500 shadow-md" />
              <div className="absolute bottom-1 -left-2 z-0 h-full w-full rounded-full bg-blue-500 shadow-md" />
              <div className="absolute -bottom-1 -left-1 z-0 h-full w-full rounded-full bg-white shadow-md" />
              <div className="absolute -top-1 left-1 z-0 h-full w-full rounded-full bg-gray-500 shadow-md" />
            </>
          )}

          {showRemoveButton && imageUrl && onImageRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className={cn(
                "absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full bg-destructive text-white shadow-md transition-transform hover:scale-110",
                config.remove
              )}
            >
              {renderRemoveButton || <Trash className={config.removeIcon} />}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleImageChange}
            disabled={disabled}
          />
        </div>
      </div>
    )
  })
)

export default AvatarUploader
