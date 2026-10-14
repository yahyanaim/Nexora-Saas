"use client"

import { useEffect, useRef, useState } from "react"
import { SCREENS } from "./content"
import { ScrollShot } from "./scroll-shot"
import s from "./landing.module.css"

const TAB_SECONDS = 10

/**
 * Tabs over the real app screens. They advance on their own (a line fills
 * under the active tab while its screen scrolls top to bottom) until someone
 * picks a tab; they pause off screen.
 */
export function ProductTabs() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const screen = SCREENS[active]!

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
      <div className={s.productTabs} role="tablist" aria-label="Nexora screens">
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
              <strong>{sc.label}</strong>
            </span>
            <p>{sc.body}</p>
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
            <span className={s.windowUrl}>app.nexora.ma/dashboard/{screen.path}</span>
          </div>
          <ScrollShot
            src={screen.src}
            alt={`Nexora ${screen.label} screen, full page`}
            width={screen.width}
            height={screen.height}
            mode={auto ? "once" : "loop"}
            duration={auto ? TAB_SECONDS : 18}
            sizes="(max-width: 1100px) 100vw, 900px"
          />
        </div>
        <div className={s.productCaption}>
          <span>{screen.title}</span>
          <span>Full page · demo workspace</span>
        </div>
      </div>
    </div>
  )
}
