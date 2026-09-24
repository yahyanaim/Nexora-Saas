import { redirect } from "next/navigation"

export default async function PlansRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/plans`)
}
