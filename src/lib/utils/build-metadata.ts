import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"

export async function buildMetadata({
  locale,
  titleKey,
  descriptionKey,
}: {
  locale: string
  titleKey: string
  descriptionKey?: string
}): Promise<Metadata> {
  const t = await getTranslations({ locale })

  return {
    title: t(titleKey),
    ...(descriptionKey && { description: t(descriptionKey) }),
  }
}
