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

export async function applyZodLocale(locale: string) {
  const load = LOADERS[locale] ?? LOADERS.en!
  const { default: messages } = await load()
  z.config(messages())
}
