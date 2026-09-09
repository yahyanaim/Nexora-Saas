import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "ar", "fr", "de", "es", "ru", "hi", "ur", "zh"],
  defaultLocale: "en",
})
