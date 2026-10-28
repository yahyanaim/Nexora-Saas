import { redirect } from "next/navigation"

/** The old pricing link opens the company's own subscription, where plans are compared and changed. */
export default async function PlansRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/subscription`)
}
