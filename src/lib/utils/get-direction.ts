export function getDirection(locale: string): "ltr" | "rtl" {
  const rtlLocales = ["ar", "ur"] // Arabic and Urdu are RTL
  return rtlLocales.includes(locale) ? "rtl" : "ltr"
}
