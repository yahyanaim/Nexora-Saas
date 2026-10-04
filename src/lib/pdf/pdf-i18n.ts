import { createTranslator } from "next-intl"

/**
 * PDFs are drawn with jsPDF's built-in fonts, which only cover Latin scripts and
 * cannot shape right-to-left text. Documents are therefore written in the user's
 * language when it uses the Latin alphabet, in French for Arabic (the business
 * language of invoices in Morocco) and in English otherwise.
 */
const LATIN = new Set(["en", "fr", "de", "es"])

export function pdfLocale(locale: string) {
  const base = locale.slice(0, 2)
  if (LATIN.has(base)) return base
  return base === "ar" ? "fr" : "en"
}

export async function getPdfTranslator(locale: string) {
  const loc = pdfLocale(locale)
  const messages = (await import(`@/messages/${loc}.json`)).default as Record<string, string>
  const t = createTranslator({ locale: loc, messages })
  return {
    t: t as unknown as (key: string, values?: Record<string, string | number>) => string,
    has: (key: string) => key in messages,
    locale: loc,
  }
}
