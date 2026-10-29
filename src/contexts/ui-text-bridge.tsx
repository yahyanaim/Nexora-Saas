"use client"

import { useEffect, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { applyZodLocale } from "@/lib/i18n/zod-locale"
import { UiTextProvider } from "@/components/ui/ui-text"

/** Gives the UI kit its screen-reader words, and Zod its messages, in the reader's language (audit C-04). */
export function UiTextBridge({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const locale = useLocale()
  useEffect(() => {
    void applyZodLocale(locale, t)
  }, [locale, t])
  const value = useMemo(
    () => ({
      close: t("ui_close"),
      closePanel: t("ui_closePanel"),
      loading: t("ui_loading"),
      toggleTheme: t("ui_toggleTheme"),
      selectDate: t("ui_selectDate"),
    }),
    [t]
  )
  return <UiTextProvider value={value}>{children}</UiTextProvider>
}
