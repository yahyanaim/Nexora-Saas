"use client"

import { useEffect, useRef, useState } from "react"
import { SCREENS } from "./content"
import { fill, type LandingCopy } from "./copy"
import { ScrollShot } from "./scroll-shot"
import s from "./landing.module.css"

const TAB_SECONDS = 10

/**
 * Tabs over the real app screens. They advance on their own (a line fills
 * under the active tab while its screen scrolls top to bottom) until someone
 * picks a tab; they pause off screen.
 */
export function ProductTabs({ copy }: { copy: LandingCopy["product"] }) {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const screen = SCREENS[active]!
  const words = copy.screens[active]!

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(([e]) => {
      root.toggleAttribute("data-paused", !e?.isIntersecting)
    })
    io.observe(root)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={s.product} style={{ "--tab": `${TAB_SECONDS}s` } as React.CSSProperties}>
      <div className={s.productTabs} role="tablist" aria-label={copy.tabs}>
        {SCREENS.map((sc, i) => (
          <button
            key={sc.id}
            type="button"
            role="tab"
            id={`screen-tab-${sc.id}`}
            aria-selected={i === active}
            aria-controls="screen-panel"
            className={s.productTab}
            onClick={() => {
              setAuto(false)
              setActive(i)
            }}
          >
            <span className={s.productTabTop}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              <strong>{copy.screens[i]?.label}</strong>
            </span>
            <p>{copy.screens[i]?.body}</p>
            {auto && i === active && (
              <span
                className={s.tabProgress}
                aria-hidden
                onAnimationEnd={() => setActive((a) => (a + 1) % SCREENS.length)}
              />
            )}
          </button>
        ))}
      </div>
      <div id="screen-panel" role="tabpanel" aria-labelledby={`screen-tab-${screen.id}`} className={s.productView}>
        <div className={s.productFrame} key={screen.id}>
          <div className={s.windowBar}>
            <span className={s.dot} />
            <span className={s.dot} />
            <span className={s.dot} />
            <span className={s.windowUrl} dir="ltr">app.nexora.ma/dashboard/{screen.path}</span>
          </div>
          <ScrollShot
            src={screen.src}
            alt={fill(copy.alt, { name: words.label })}
            width={screen.width}
            height={screen.height}
            mode={auto ? "once" : "loop"}
            duration={auto ? TAB_SECONDS : 18}
            sizes="(max-width: 1100px) 100vw, 900px"
            fill
          />
        </div>
        <div className={s.productCaption}>
          <span>{words.title}</span>
          <span>{copy.caption}</span>
        </div>
      </div>
    </div>
  )
}
