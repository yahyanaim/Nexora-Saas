import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import { getLandingCopy } from "@/components/landing/copy"

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const { meta } = getLandingCopy(locale)
  return { title: meta.title, description: meta.description }
}

const page = async ({ params }: PageProps) => {
  const { locale } = await params
  return <LandingPage locale={locale} />
}

export default page
