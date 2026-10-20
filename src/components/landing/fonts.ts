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

// Arabic letters (Geist has none). Not preloaded and limited to the Arabic
// range, so English and French pages never download it.
export const arabic = localFont({
  src: "../../fonts/noto-sans-arabic-var.woff2",
  weight: "100 900",
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC",
    },
  ],
})
