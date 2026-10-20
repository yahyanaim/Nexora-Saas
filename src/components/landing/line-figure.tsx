"use client"

import { useRef } from "react"
import {
  Exploded,
  Hub,
  Lockers,
  Padlock,
  Plot,
  Query,
  Relay,
  Riffle,
  Settle,
  Slow,
  Terrain,
  Vault,
  type HairlineProps,
} from "@lucasmarkes/hairline/react"
import s from "./landing.module.css"

const FIGURES = {
  exploded: Exploded,
  hub: Hub,
  lockers: Lockers,
  padlock: Padlock,
  plot: Plot,
  query: Query,
  relay: Relay,
  riffle: Riffle,
  settle: Settle,
  slow: Slow,
  terrain: Terrain,
  vault: Vault,
} satisfies Record<string, React.ComponentType<HairlineProps>>

export type FigureName = keyof typeof FIGURES

/**
 * A Hairline line figure in the Nexora blues (theme in landing.module.css,
 * .figure). It walks through its answer on its own until a pointer or focus
 * arrives; the mono caption under it reads what the figure shows.
 */
export function LineFigure({
  name,
  label,
  tag,
  className,
}: {
  name: FigureName
  /** Accessible name, in the page's language */
  label: string
  /** Short mono label before the live reading */
  tag?: string
  className?: string
}) {
  const Figure = FIGURES[name]
  const readRef = useRef<HTMLSpanElement>(null)
  return (
    <figure className={`${s.figure} ${className ?? ""}`}>
      <Figure
        label={label}
        theme="light"
        intensity={0.6}
        play
        dir="ltr"
        onRead={(text) => {
          if (readRef.current) readRef.current.textContent = text
        }}
      />
      <figcaption className={s.figureCaption} aria-hidden>
        <span>{tag}</span>
        <span ref={readRef} dir="ltr" />
      </figcaption>
    </figure>
  )
}
