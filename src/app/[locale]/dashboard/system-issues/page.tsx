import { redirect } from "next/navigation"

/** The old System issues page became System health (Lot A5); old links still work. */
export default async function SystemIssuesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/health`)
}
