import NextTopLoader from "nextjs-toploader"
import NProgress from "nprogress"
import ProviderContexts from "@/contexts/app-provider"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import localFont from "next/font/local"
import { routing } from "@/i18n/routing"
import "./globals.css"
import { notFound } from "next/navigation"

NProgress.configure({ showSpinner: false })

const myFont = localFont({
  src: [
    {
      path: "../../../public/fonts/NotoKufiArabicRegular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/NotoKufiArabicBold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
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
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html
      className={myFont.variable}
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
