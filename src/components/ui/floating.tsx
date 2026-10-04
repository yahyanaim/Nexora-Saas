"use client"

import * as React from "react"
import { createPortal } from "react-dom"

type Side = "top" | "bottom" | "left" | "right"
type Align = "start" | "end" | "center"

/**
 * Renders a menu or popover in <body>, fixed next to its anchor, so cards and
 * tables with overflow hidden never clip it. It flips above the anchor when
 * there is no room below and stays inside the viewport.
 */
export function FloatingLayer({
  anchorRef,
  side = "bottom",
  align = "start",
  offset = 6,
  contentRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  side?: Side
  align?: Align
  offset?: number
  contentRef?: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999 })

  React.useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const el = innerRef.current
      if (!a || !el) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top: number
      let left: number
      if (side === "left" || side === "right") {
        left = side === "right" ? a.right + offset : a.left - w - offset
        if (left + w > vw - 8 || left < 8) left = side === "right" ? a.left - w - offset : a.right + offset
        top = align === "end" ? a.bottom - h : a.top
      } else {
        const fitsBelow = a.bottom + offset + h <= vh - 8
        const fitsAbove = a.top - offset - h >= 8
        const up = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove
        top = up ? a.top - offset - h : a.bottom + offset
        left = align === "end" ? a.right - w : align === "center" ? a.left + a.width / 2 - w / 2 : a.left
      }
      left = Math.min(Math.max(8, left), Math.max(8, vw - w - 8))
      top = Math.min(Math.max(8, top), Math.max(8, vh - h - 8))
      setStyle({ position: "fixed", top, left })
    }
    place()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null
    if (innerRef.current) ro?.observe(innerRef.current)
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [anchorRef, side, align, offset])

  if (typeof document === "undefined") return null
  return createPortal(
    <div
      ref={(node) => {
        innerRef.current = node
        if (contentRef) contentRef.current = node
      }}
      style={style}
      className="z-[95]"
    >
      {children}
    </div>,
    document.body
  )
}
