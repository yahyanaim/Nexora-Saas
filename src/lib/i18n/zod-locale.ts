import { z } from "zod"

type LocaleModule = { default: () => Parameters<typeof z.config>[0] }

// Only the reader's language is loaded; Zod's own messages ("Too small…",
// "Invalid email") then follow it, like the app's texts (audit C-04)
const LOADERS: Record<string, () => Promise<LocaleModule>> = {
  en: () => import("zod/v4/locales/en.js"),
  fr: () => import("zod/v4/locales/fr.js"),
  ar: () => import("zod/v4/locales/ar.js"),
  de: () => import("zod/v4/locales/de.js"),
  es: () => import("zod/v4/locales/es.js"),
  hi: () => import("zod/v4/locales/hi.js"),
  ru: () => import("zod/v4/locales/ru.js"),
  ur: () => import("zod/v4/locales/ur.js"),
  zh: () => import("zod/v4/locales/zh-CN.js"),
}

type Translate = (key: string, values?: Record<string, string | number>) => string
type Issue = { code?: string; origin?: string; format?: string; input?: unknown; minimum?: unknown; maximum?: unknown; inclusive?: boolean }

/**
 * The app's own wording for the common checks, so no message names a type
 * ("string", "number"): some of Zod's translations do. Anything else falls
 * back to Zod's translation. A message written on the schema always wins.
 */
export function appZodMessage(issue: Issue, t: Translate): string | undefined {
  const min = Number(issue.minimum)
  const max = Number(issue.maximum)
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null || issue.input === "") return t("zod_required")
      return issue.origin === "number" || typeof issue.input === "string" ? t("zod_number") : t("zod_invalid")
    case "too_small":
      if (issue.origin === "string") return min <= 1 ? t("zod_required") : t("zod_tooShort", { min })
      if (issue.origin === "array" || issue.origin === "set") return t("zod_minItems", { min })
      if (issue.origin === "number" || issue.origin === "bigint") return issue.inclusive === false ? t("zod_above", { min }) : t("zod_min", { min })
      return undefined
    case "too_big":
      if (issue.origin === "string") return t("zod_tooLong", { max })
      if (issue.origin === "array" || issue.origin === "set") return t("zod_maxItems", { max })
      if (issue.origin === "number" || issue.origin === "bigint") return issue.inclusive === false ? t("zod_below", { max }) : t("zod_max", { max })
      return undefined
    case "invalid_format":
      if (issue.format === "email") return t("validEmail")
      if (issue.format === "url") return t("err_badUrl")
      return t("zod_invalid")
    case "invalid_value":
      return t("zod_invalid")
    default:
      return undefined
  }
}

export async function applyZodLocale(locale: string, t?: Translate) {
  const load = LOADERS[locale] ?? LOADERS.en!
  const { default: messages } = await load()
  z.config({ ...messages(), customError: t ? (issue) => appZodMessage(issue as Issue, t) : undefined })
}
