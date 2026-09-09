import moment from "moment"
require("moment/locale/ar")

export const formatDateFacebook = (
  dateInput?: string | Date,
  locale: string = "ar"
): string => {
  if (!dateInput) return locale.startsWith("ar") ? "غير معروف" : "Unknown"

  const date = moment(dateInput).locale(locale)

  if (!date.isValid()) return locale.startsWith("ar") ? "غير معروف" : "Unknown"

  const now = moment()
  const diffInHours = now.diff(date, "hours")
  const diffInDays = now.diff(date, "days")

  if (diffInHours < 24) {
    return date.fromNow()
  }

  if (diffInDays === 1) {
    if (locale.startsWith("ar")) {
      return `أمس الساعة ${date.format("h:mm A")}`
        .replace("AM", "ص")
        .replace("PM", "م")
    }
    return `Yesterday at ${date.format("h:mm A")}`
  }

  if (now.year() === date.year()) {
    if (locale.startsWith("ar")) {
      return date
        .format("D MMMM [الساعة] h:mm A")
        .replace("AM", "ص")
        .replace("PM", "م")
    }
    return date.format("D MMMM [at] h:mm A")
  }

  return date.format("D MMMM YYYY")
}

export function formatDateWhatsapp(
  dateString?: string | Date,
  locale: string = "ar"
): string {
  if (!dateString) return ""

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""

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

  const date = moment(dateInput).locale(locale)

  if (!date.isValid()) return ""

  const now = moment()
  const diffInSeconds = now.diff(date, "seconds")
  const diffInMinutes = now.diff(date, "minutes")
  const diffInHours = now.diff(date, "hours")
  const diffInDays = now.diff(date, "days")
  const diffInWeeks = now.diff(date, "weeks")

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

  if (now.year() === date.year()) {
    return date.format("MMM D")
  }

  return date.format("MMM D, YYYY")
}
