import NextTopLoader from "nextjs-toploader"
import ProviderContexts from "@/contexts/app-provider"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { Inter } from "next/font/google"
import localFont from "next/font/local"
import { cn } from "@/lib/utils"
import { routing } from "@/i18n/routing"
import "./globals.css"
import { notFound } from "next/navigation"
import { headers } from "next/headers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

// Technical family (IDs, codes, keys); numbers use Inter's tabular figures.
// Bundled (variable, latin) so builds don't depend on fetching it.
const robotoMono = localFont({
  src: "../../fonts/roboto-mono-latin-var.woff2",
  weight: "400 700",
  variable: "--font-mono",
  display: "swap",
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale })

  return {
    title: {
      default: t("appName"),
      template: `%s | ${t("appName")}`,
    },
    description: t("appBio"),
    icons: "/app-logo.png",
  }
}
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound()
  }

  const messages = await getMessages()
  // Per-request CSP nonce set by src/proxy.ts (reading it renders dynamically)
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      className={cn(inter.variable, robotoMono.variable)}
      suppressHydrationWarning
      lang={locale}
      dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}
    >
      {/* Browser extensions (Grammarly, password managers) add attributes to body before React loads */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ProviderContexts nonce={nonce}>
            <NextTopLoader
              color="var(--primary)"
              height={3}
              showSpinner={false}
              crawlSpeed={200}
            />
            <div id="portal-root"></div>
            {children}
          </ProviderContexts>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
