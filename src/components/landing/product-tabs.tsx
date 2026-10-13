"use client"

import Image from "next/image"
import { useState } from "react"
import { SCREENS } from "./content"
import s from "./landing.module.css"

export function ProductTabs() {
  const [active, setActive] = useState(0)
  const screen = SCREENS[active]!

  return (
    <div className={s.product}>
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
            onClick={() => setActive(i)}
          >
            <span className={s.productTabTop}>
              <small>{String(i + 1).padStart(2, "0")}</small>
              <strong>{sc.label}</strong>
            </span>
            <p>{sc.body}</p>
          </button>
        ))}
      </div>
      <div id="screen-panel" role="tabpanel" aria-labelledby={`screen-tab-${screen.id}`} className={s.productView}>
        <div className={s.productFrame}>
          <Image
            key={screen.src}
            src={screen.src}
            alt={`Nexora ${screen.label} screen`}
            width={2400}
            height={1500}
            sizes="(max-width: 1100px) 100vw, 900px"
            className={s.shot}
          />
        </div>
        <div className={s.productCaption}>
          <span>{screen.title}</span>
          <span>Demo workspace</span>
        </div>
      </div>
    </div>
  )
}
