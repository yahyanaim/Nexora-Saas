import {
  format,
  formatDistanceToNow,
  differenceInHours,
  differenceInDays,
  differenceInMinutes,
  differenceInSeconds,
  differenceInWeeks,
  isSameYear,
  isValid,
  type Locale,
} from "date-fns"
import { ar, enUS, fr, es } from "date-fns/locale"

function getDateLocale(locale: string = "en"): Locale {
  if (locale.startsWith("ar")) return ar
  if (locale.startsWith("fr")) return fr
  if (locale.startsWith("es")) return es
  return enUS
}

export const formatDate = (
  dateInput?: string | Date,
  locale: string = "en"
): string => {
  if (!dateInput) return ""
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!isValid(date)) return ""
  return format(date, "MMM d, yyyy • h:mm a", { locale: getDateLocale(locale) })
}

export const formatDateFacebook = (
  dateInput?: string | Date,
  locale: string = "ar"
): string => {
  const isAr = locale.startsWith("ar")
  if (!dateInput) return isAr ? "غير معروف" : "Unknown"

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!isValid(date)) return isAr ? "غير معروف" : "Unknown"

  const now = new Date()
  const diffInHours = differenceInHours(now, date)
  const diffInDays = differenceInDays(now, date)

  if (diffInHours < 24) {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: getDateLocale(locale),
    })
  }

  if (diffInDays === 1) {
    if (isAr) {
      return `أمس الساعة ${format(date, "h:mm a", { locale: ar })}`
        .replace("AM", "ص")
        .replace("PM", "م")
    }
    return `Yesterday at ${format(date, "h:mm a", { locale: enUS })}`
  }

  if (isSameYear(now, date)) {
    if (isAr) {
      return format(date, "d MMMM 'الساعة' h:mm a", { locale: ar })
        .replace("AM", "ص")
        .replace("PM", "م")
    }
    return format(date, "d MMMM 'at' h:mm a", { locale: getDateLocale(locale) })
  }

  return format(date, "d MMMM yyyy", { locale: getDateLocale(locale) })
}

export function formatDateWhatsapp(
  dateString?: string | Date,
  locale: string = "ar"
): string {
  if (!dateString) return ""

  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  if (!isValid(date)) return ""

  const now = new Date()

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  const diffTime = now.getTime() - date.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)

  if (isSameDay) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isYesterday) {
    return locale.startsWith("ar") ? "أمس" : "Yesterday"
  }

  if (diffDays < 7) {
    return date.toLocaleDateString(locale, { weekday: "long" })
  }

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export const formatDateInstagram = (
  dateInput?: string | Date,
  locale: string = "ar"
): string => {
  if (!dateInput) return ""

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!isValid(date)) return ""

  const now = new Date()
  const diffInSeconds = differenceInSeconds(now, date)
  const diffInMinutes = differenceInMinutes(now, date)
  const diffInHours = differenceInHours(now, date)
  const diffInDays = differenceInDays(now, date)
  const diffInWeeks = differenceInWeeks(now, date)

  const isAr = locale.startsWith("ar")

  if (diffInSeconds < 60) {
    return isAr ? "الآن" : "now"
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}${isAr ? " د" : "m"}`
  }

  if (diffInHours < 24) {
    return `${diffInHours}${isAr ? " س" : "h"}`
  }

  if (diffInDays < 7) {
    return `${diffInDays}${isAr ? " ي" : "d"}`
  }

  if (diffInWeeks < 4) {
    return `${diffInWeeks}${isAr ? " أ" : "w"}`
  }

  if (isSameYear(now, date)) {
    return format(date, "MMM d", { locale: getDateLocale(locale) })
  }

  return format(date, "MMM d, yyyy", { locale: getDateLocale(locale) })
}
