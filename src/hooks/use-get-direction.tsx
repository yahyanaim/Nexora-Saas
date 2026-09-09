import { getDirection } from "@/lib/utils/get-direction"
import { useLocale } from "next-intl"

export const useGetDirection = () => {
  const locale = useLocale()
  const dir = getDirection(locale)
  return { dir, locale }
}
