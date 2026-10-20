"use client"

import { useState } from "react"
import { CODE_FILES } from "./content"
import type { LandingCopy } from "./copy"
import s from "./landing.module.css"

export function CodeTabs({ copy }: { copy: LandingCopy["compliance"] }) {
  const [active, setActive] = useState(0)
  const tab = CODE_FILES[active]!

  return (
    <div className={s.code}>
      <div className={s.tabs} role="tablist" aria-label={copy.tabs}>
        {CODE_FILES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={i === active}
            aria-controls="code-panel"
            className={s.tab}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre id="code-panel" role="tabpanel" aria-labelledby={`tab-${tab.id}`} className={s.pre} dir="ltr">
        {tab.code.split("\n").map((line, i) => (
          <div key={i}>
            <span className={s.lineNo}>{i + 1}</span>
            {line}
          </div>
        ))}
      </pre>
      <div className={s.codeCaption}>{"// "}{copy.captions[active]}</div>
    </div>
  )
}
