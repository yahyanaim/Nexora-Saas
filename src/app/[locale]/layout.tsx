import NextTopLoader from "nextjs-toploader"
import ProviderContexts from "@/contexts/app-provider"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { routing } from "@/i18n/routing"
import "./globals.css"
import { notFound } from "next/navigation"

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

  return (
    <html
      className={cn(ibmPlexSans.variable, ibmPlexMono.variable)}
      suppressHydrationWarning
      lang={locale}
      dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}
    >
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ProviderContexts>
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
