import localFont from "next/font/local"

// Geist and Geist Mono for the landing page only. Bundled (variable, OFL)
// so builds don't depend on fetching them.
export const geist = localFont({
  src: "../../fonts/geist-var.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
})

export const geistMono = localFont({
  src: "../../fonts/geist-mono-var.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
})
