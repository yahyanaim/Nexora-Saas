import { ar } from "./ar"
import { en, type LandingCopy } from "./en"
import { fr } from "./fr"

export type { LandingCopy }

const COPY: Record<string, LandingCopy> = { en, fr, ar }

/** The landing page words for a locale; English for languages it isn't written in */
export const getLandingCopy = (locale: string): LandingCopy => COPY[locale] ?? en

/** Fills {name} placeholders */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
