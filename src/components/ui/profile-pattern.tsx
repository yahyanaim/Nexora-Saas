"use client"

import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { cn } from "@/lib/utils"
import {
  Heart,
  Cloud,
  Leaf,
  Flame,
  Crown,
  Diamond,
  Zap,
  Star,
  Sparkles,
  Snowflake,
  Volleyball,
  TreePalm,
} from "@/components/ui/carbon/icons"
import { memo, useEffect, useMemo, useRef, useState } from "react"

interface Props {
  color?: string
  Icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  density?: "full" | "compact"
  className?: string
}

export const PROFILE_PATTERNS = [
  { color: "#FF6B6B", name: "Red", icon: Heart },
  { color: "#FF9F43", name: "Orange", icon: TreePalm },
  { color: "#FECA57", name: "Yellow", icon: Star },
  { color: "#48DBFB", name: "Sky Blue", icon: Cloud },
  { color: "#0ABDE3", name: "Blue", icon: Snowflake },
  { color: "#10AC84", name: "Green", icon: Leaf },
  { color: "#EE5A24", name: "Dark Orange", icon: Flame },
  { color: "#5F27CD", name: "Purple", icon: Crown },
  { color: "#341F97", name: "Dark Blue", icon: Volleyball },
  { color: "#FF6FB7", name: "Pink", icon: Sparkles },
  { color: "#8395A7", name: "Gray", icon: Diamond },
  { color: "#222F3E", name: "Dark", icon: Zap },
]
export const DENSITY_CONFIG = {
  full: { count: 34, allowBlur: true, allow3D: true },
  compact: { count: 10, allowBlur: false, allow3D: false },
}

export const ProfilePattern = memo(
  ({ color, Icon, className, density = "full" }: Props) => {
    const { authedUser } = useAuthGuard()
    const containerRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(density === "full")

    const config = DENSITY_CONFIG[density]

    const currentPattern = PROFILE_PATTERNS?.find(
      (el) => el?.color === authedUser?.profileColor
    )
    const DefaultIcon = currentPattern?.icon
    const FinalIcon = Icon || DefaultIcon
    const finalColor = color || currentPattern?.color

    useEffect(() => {
      if (density === "full") return
      const el = containerRef.current
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => setIsVisible(entry?.isIntersecting ?? false),
        { rootMargin: "100px" }
      )
      observer.observe(el)
      return () => observer.disconnect()
    }, [density])

    const particles = useMemo(() => {
      return Array.from({ length: config.count }).map((_, i) => {
        const size =
          density === "full" ? 14 + Math.random() * 22 : 12 + Math.random() * 10
        const top = Math.random() * 100
        const left = Math.random() * 100
        const depth = config.allow3D ? -120 + Math.random() * 240 : 0
        const rotateX = config.allow3D ? Math.random() * 360 : 0
        const rotateY = Math.random() * 360
        const duration = 14 + Math.random() * 18
        const delay = Math.random() * -20
        const direction = Math.random() > 0.5 ? "normal" : "reverse"
        const opacity = 0.08 + Math.random() * 0.22
        const blur = config.allowBlur && Math.random() > 0.7 ? 0.5 : 0

        return {
          id: i,
          size,
          top,
          left,
          depth,
          rotateX,
          rotateY,
          duration,
          delay,
          direction,
          opacity,
          blur,
        }
      })
    }, [config.count, config.allow3D, config.allowBlur, density])

    return (
      <div
        ref={containerRef}
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden",
          className
        )}
        style={{
          background: `linear-gradient(180deg, ${finalColor}22 0%, ${finalColor}11 50%, transparent 100%)`,
          perspective: config.allow3D ? "800px" : undefined,
          perspectiveOrigin: "50% 50%",
          contain: "layout style paint",
        }}
      >
        <div
          className="relative h-full w-full"
          style={{ transformStyle: config.allow3D ? "preserve-3d" : undefined }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute flex items-center justify-center"
              style={{
                top: `${p.top}%`,
                left: `${p.left}%`,
                color: finalColor,
                opacity: p.opacity,
                filter: p.blur ? `blur(${p.blur}px)` : undefined,
                transformStyle: config.allow3D ? "preserve-3d" : undefined,
                willChange: isVisible ? "transform" : "auto",
                animation: `profile-pattern-spin ${p.duration}s linear infinite`,
                animationPlayState: isVisible ? "running" : "paused",
                animationDirection: p.direction,
                animationDelay: `${p.delay}s`,
                ...({
                  "--rx": `${p.rotateX}deg`,
                  "--ry": `${p.rotateY}deg`,
                  "--tz": `${p.depth}px`,
                } as React.CSSProperties),
              }}
            >
              {FinalIcon ? <FinalIcon size={p.size} strokeWidth={1.5} /> : ""}
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes profile-pattern-spin {
            0% {
              transform: translate3d(-50%, -50%, var(--tz)) rotateX(var(--rx))
                rotateY(var(--ry));
            }
            50% {
              transform: translate3d(-50%, -50%, calc(var(--tz) * -1))
                rotateX(calc(var(--rx) + 180deg))
                rotateY(calc(var(--ry) + 180deg));
            }
            100% {
              transform: translate3d(-50%, -50%, var(--tz))
                rotateX(calc(var(--rx) + 360deg))
                rotateY(calc(var(--ry) + 360deg));
            }
          }

          @media (prefers-reduced-motion: reduce) {
            div {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    )
  }
)

ProfilePattern.displayName = "ProfilePattern"
