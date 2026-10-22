import { getTranslations } from "next-intl/server"
import { NexusMark } from "@/components/ui/nexus"

export default async function Loading() {
  const t = await getTranslations()
  return (
    <div role="status" className="flex min-h-[50vh] w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <NexusMark animated className="size-12" />
        <p className="text-sm font-medium text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  )
}
