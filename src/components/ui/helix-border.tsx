import { cn } from "@/lib/utils"
import { CSSProperties } from "react"

interface Props {
  color?: string
  width?: number
  className?: string
  children?: React.ReactNode
  style?: CSSProperties
  onClick?: () => void
}

export function HelixBorder({
  color = "var(--primary)",
  width = 4,
  className,
  children,
  style,
  onClick = () => null,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={cn("relative overflow-hidden", className)}
      style={style}
    >
      <div
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
        style={{ width, backgroundColor: color }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              130deg,
              rgba(255,255,255,0)    0px,
              rgba(255,255,255,0)    2.75px,
              rgba(255,255,255,0.55) 2.75px,
              rgba(255,255,255,0.55) 5.5px
            )`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(
              90deg,
              rgba(0,0,0,0.35)   0%,
              rgba(255,255,255,0.3) 35%,
              rgba(255,255,255,0)  60%,
              rgba(0,0,0,0.3)    100%
            )`,
          }}
        />
      </div>

      <div style={{ paddingLeft: width }}>{children}</div>
    </div>
  )
}
