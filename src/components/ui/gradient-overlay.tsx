import * as React from "react"
import { cn } from "@/lib/utils"

interface GradientOverlayProps {
  children?: React.ReactNode
  as?: React.ElementType
  position?: "absolute" | "fixed" | "sticky" | "relative"
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
  zIndex?: number
  from?: string
  via?: string
  to?: string
  direction?: "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br"
  className?: string
  innerClassName?: string
  childrenClassName?: string
  width?: string | number
  height?: string | number
  fullWidth?: boolean
  fullHeight?: boolean
  inset?: boolean
  pointerEvents?: "none" | "auto"
  opacity?: number
  blur?: string | number
  rounded?: string
  border?: string
  shadow?: string
}

export const GradientOverlay = React.forwardRef<
  HTMLDivElement,
  GradientOverlayProps
>(
  (
    {
      children,
      as: Component = "div",
      position = "absolute",
      placement = "bottom",
      zIndex = 10,
      from = "from-background",
      via = "via-background/80",
      to = "to-transparent",
      direction = "t",
      className,
      innerClassName,
      childrenClassName,
      width = "100%",
      height = "auto",
      fullWidth = false,
      fullHeight = false,
      inset = false,
      pointerEvents = "none",
      opacity = 100,
      blur,
      rounded,
      border,
      shadow,
    },
    ref
  ) => {
    const gradientDirection =
      {
        t: "bg-gradient-to-t",
        b: "bg-gradient-to-b",
        l: "bg-gradient-to-l",
        r: "bg-gradient-to-r",
        tl: "bg-gradient-to-tl",
        tr: "bg-gradient-to-tr",
        bl: "bg-gradient-to-bl",
        br: "bg-gradient-to-br",
      }[direction] || "bg-gradient-to-t"

    const flexPlacement =
      {
        top: "flex-col-reverse justify-start",
        bottom: "flex-col justify-end",
        left: "flex-row-reverse justify-start",
        right: "flex-row justify-end",
        center: "flex-col justify-center",
        "top-left": "flex-col-reverse justify-start items-start",
        "top-right": "flex-col-reverse justify-start items-end",
        "bottom-left": "flex-col justify-end items-start",
        "bottom-right": "flex-col justify-end items-end",
      }[placement] || "flex-col justify-end"

    const positionClasses =
      {
        top: "top-0 left-0 right-0",
        bottom: "bottom-0 left-0 right-0",
        left: "left-0 top-0 bottom-0",
        right: "right-0 top-0 bottom-0",
        center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "top-left": "top-0 left-0",
        "top-right": "top-0 right-0",
        "bottom-left": "bottom-0 left-0",
        "bottom-right": "bottom-0 right-0",
      }[placement] || "bottom-0 left-0 right-0"

    const itemsAlignment =
      {
        top: "items-center",
        bottom: "items-center",
        left: "items-center",
        right: "items-center",
        center: "items-center",
        "top-left": "items-start",
        "top-right": "items-end",
        "bottom-left": "items-start",
        "bottom-right": "items-end",
      }[placement] || "items-center"

    const opacityClass = opacity < 100 ? `opacity-${opacity}` : ""

    const blurClass = blur ? `backdrop-blur-${blur}` : ""

    const roundedClass = rounded ? `rounded-${rounded}` : ""

    const borderClass = border ? `border-${border}` : ""

    const shadowClass = shadow ? `shadow-${shadow}` : ""

    return (
      <Component
        ref={ref}
        className={cn(
          "pointer-events-none",
          position === "absolute" && "absolute",
          position === "fixed" && "fixed",
          position === "sticky" && "sticky",
          position === "relative" && "relative",
          positionClasses,
          flexPlacement,
          itemsAlignment,
          fullWidth && "w-full",
          fullHeight && "h-full",
          inset && "inset-0",
          roundedClass,
          borderClass,
          shadowClass,
          opacityClass,
          blurClass,
          className
        )}
        style={{
          width: fullWidth ? "100%" : width,
          height: fullHeight ? "100%" : height,
          zIndex,
          pointerEvents: pointerEvents === "none" ? "none" : "auto",
        }}
      >
        {/* Gradient layer */}
        <div
          className={cn(
            "pointer-events-none flex",
            gradientDirection,
            from,
            via,
            to,
            flexPlacement,
            itemsAlignment,
            fullWidth && "w-full",
            fullHeight && "h-full",
            roundedClass,
            innerClassName
          )}
          style={{
            width: fullWidth ? "100%" : width,
            height: fullHeight ? "100%" : height,
          }}
        >
          {/* Children wrapper - clicks enabled */}
          {children && (
            <div className={cn("pointer-events-auto", childrenClassName)}>
              {children}
            </div>
          )}
        </div>
      </Component>
    )
  }
)

GradientOverlay.displayName = "GradientOverlay"
