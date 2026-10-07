"use client"

import { useTranslations } from "next-intl"

/** First stop for keyboard users: jumps past the top bar and menu to the page content. */
export function SkipLink() {
  const t = useTranslations()
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
    >
      {t("skipToContent")}
    </a>
  )
}
