"use client"

import * as React from "react"
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes"

export const WALLPAPER_NAMES = [
  "purple",
  "animals",
  "game",
  "ice",
  "occasions",
  "rose",
  "study",
  "substantial",
  // "love",
] as const

export const PREVIEW_GRADIENTS: Record<
  WallpaperName,
  { light: string; dark: string }
> = {
  purple: {
    light: `linear-gradient(135deg, lab(65 29.35 -53.15) 0%, lab(71 35.38 -47.46) 45%, lab(77 23.96 -31.26) 100%)`,
    dark: `linear-gradient(135deg, lab(29% 26.64 -45.47) 0%, lab(19 25.53 -35.65) 45%, lab(28% 55 -67.98) 100%)`,
  },
  animals: {
    light: "linear-gradient(135deg, #A8D5AA 0%, #7DBF80 100%)",
    dark: "linear-gradient(135deg, #1B3A1E 0%, #0F2A12 100%)",
  },
  game: {
    light: "linear-gradient(135deg, #E8C070 0%, #D0A040 100%)",
    dark: "linear-gradient(135deg, #4A2E0F 0%, #3A220A 100%)",
  },
  ice: {
    light: "linear-gradient(135deg, #B0D8E8 0%, #80C0D8 100%)",
    dark: "linear-gradient(135deg, #1A3A4D 0%, #0F2A3A 100%)",
  },
  occasions: {
    light: "linear-gradient(135deg, #E8C880 0%, #D0A850 100%)",
    dark: "linear-gradient(135deg, #4A3A0F 0%, #3A2E0A 100%)",
  },
  rose: {
    light: "linear-gradient(135deg, #E8B0B8 0%, #C88088 100%)",
    dark: "linear-gradient(135deg, #4A1E33 0%, #3A1528 100%)",
  },
  study: {
    light: "linear-gradient(135deg, #A8B8D8 0%, #8098C0 100%)",
    dark: "linear-gradient(135deg, #1E1E3A 0%, #151528 100%)",
  },
  substantial: {
    light: "linear-gradient(135deg, #C8C0B8 0%, #A8A090 100%)",
    dark: "linear-gradient(135deg, #3A3630 0%, #2A2620 100%)",
  },
  // love: {
  //   light: "linear-gradient(135deg, #E8A0A0 0%, #C87070 100%)",
  //   dark: "linear-gradient(135deg, #4A1E1E 0%, #3A1515 100%)",
  // },
}
export type WallpaperName = (typeof WALLPAPER_NAMES)[number]

type ThemeContextValue = {
  theme?: string
  setTheme: (theme: string) => void
  resolvedTheme?: string
  wallpaperClassName: string
  systemTheme?: string
  themes: string[]
  toggleTheme: (event?: React.MouseEvent<HTMLElement>) => void
  wallpaper: WallpaperName
  setWallpaper: (name: WallpaperName) => void
  availableWallpapers: readonly WallpaperName[]
  isDark?: boolean
}

export const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  attribute = "class",
  enableSystem = false,
  ...delegated
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      defaultTheme={defaultTheme}
      attribute={attribute}
      enableSystem={enableSystem}
      {...delegated}
    >
      <ThemeProviderCore>{children}</ThemeProviderCore>
    </NextThemesProvider>
  )
}

function ThemeProviderCore({ children }: { children: React.ReactNode }) {
  const nextTheme = useNextTheme()

  const [wallpaper, setWallpaperState] = React.useState<WallpaperName>("rose")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("wallpaper") as WallpaperName | null
    if (saved && WALLPAPER_NAMES.includes(saved)) {
      setWallpaperState(saved)
    }
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    const root = document.documentElement

    root.classList.remove(...WALLPAPER_NAMES)
    root.classList.add(wallpaper)
  }, [wallpaper, mounted])

  const setWallpaper = React.useCallback((name: WallpaperName) => {
    setWallpaperState(name)
    localStorage.setItem("wallpaper", name)
  }, [])

  const toggleTheme = React.useCallback(() => {
    const nextMode = nextTheme.resolvedTheme === "dark" ? "light" : "dark"

    nextTheme.setTheme(nextMode)
  }, [nextTheme.resolvedTheme, nextTheme.setTheme])

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      ...nextTheme,
      toggleTheme,
      wallpaper,
      wallpaperClassName: `${nextTheme?.resolvedTheme} ${wallpaper}`,
      setWallpaper,
      isDark: nextTheme?.resolvedTheme === "dark",
      availableWallpapers: WALLPAPER_NAMES,
    }),
    [nextTheme, toggleTheme, wallpaper, setWallpaper]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
