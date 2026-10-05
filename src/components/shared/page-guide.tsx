"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Information } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

const STORAGE = "nexora:guide-hidden"

function hiddenGuides(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) ?? "[]")
  } catch {
    return []
  }
}

/** Translation key of a page's guide: guide_<last path segment>. */
export function guideKeyFor(url: string, isClient = false) {
  const slug = url.split("/").filter(Boolean).pop()?.replace(/-/g, "_") ?? ""
  return `guide_${slug}${isClient && slug === "portal" ? "_client" : ""}`
}

/**
 * "How this page works": a paragraph on what the page is for, then one line
 * per section ("Section: what you do there"). Open on a first visit; once
 * hidden it stays hidden for that page on this device.
 */
export function PageGuide({ guideKey }: { guideKey: string }) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(!hiddenGuides().includes(guideKey)), [guideKey])
  if (!t.has(guideKey)) return null

  const [intro = "", ...items] = t(guideKey).split("\n").filter(Boolean)
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      const rest = hiddenGuides().filter((k) => k !== guideKey)
      localStorage.setItem(STORAGE, JSON.stringify(next ? rest : [...rest, guideKey]))
    } catch {
      // Storage blocked: the guide still opens and closes for this visit
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-xs font-medium text-info-foreground transition-colors hover:bg-info-soft/70"
      >
        <Information className="size-3.5" />
        {t("guideTitle")}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <p className="max-w-4xl leading-relaxed text-foreground/90">{intro}</p>
          {items.length > 0 && (
            <ul className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
              {items.map((line) => {
                const i = line.indexOf(": ")
                const head = i > 0 ? line.slice(0, i) : ""
                const body = i > 0 ? line.slice(i + 2) : line
                return (
                  <li key={line} className="flex gap-2 leading-relaxed text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>
                      {head && <span className="font-medium text-foreground">{head}: </span>}
                      {body}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
