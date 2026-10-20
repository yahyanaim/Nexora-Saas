"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Languages } from "@/components/ui/carbon/icons"
import { Link } from "@/i18n/navigation"
import { LANDING_LOCALES } from "./content"
import s from "./landing.module.css"

/** The app's language icon in the nav; opens a short list of the page's languages */
export function LanguageMenu({ current, label }: { current: string; label: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const active = LANDING_LOCALES.find((l) => l.code === current) ?? LANDING_LOCALES[0]

  return (
    <div className={s.lang} ref={rootRef}>
      <button
        type="button"
        className={s.langBtn}
        aria-label={label}
        aria-expanded={open}
        aria-controls="landing-languages"
        onClick={() => setOpen((o) => !o)}
      >
        <Languages className={s.langIcon} />
        <span className={s.langCode}>{active.code}</span>
      </button>
      {open && (
        <ul id="landing-languages" className={s.langMenu} aria-label={label}>
          {LANDING_LOCALES.map((l) => (
            <li key={l.code}>
              <Link
                href="/"
                locale={l.code}
                lang={l.code}
                aria-current={l.code === current ? "true" : undefined}
                className={s.langItem}
                onClick={() => setOpen(false)}
              >
                <span>{l.native}</span>
                <small>{l.code}</small>
                {l.code === current && <Check className={s.langCheck} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
