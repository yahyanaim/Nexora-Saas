import { redirect } from "next/navigation"

/** Old billing links open the company's own subscription (the console list is for the Nexora team). */
export default async function BillingRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/subscription`)
}
