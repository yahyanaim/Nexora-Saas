import React from "react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"

/** Wraps UI in the English next-intl provider used by the app. */
export function IntlWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
