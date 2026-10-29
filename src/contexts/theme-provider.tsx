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

  const [wallpaper, setWallpaperState] = React.useState<WallpaperName>("substantial")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
      const saved = localStorage.getItem("wallpaper") as WallpaperName | null
      if (saved === "rose") {
        setWallpaperState("substantial")
        localStorage.setItem("wallpaper", "substantial")
      } else if (saved && WALLPAPER_NAMES.includes(saved)) {
        setWallpaperState(saved)
      }
    })
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

  const { resolvedTheme, setTheme } = nextTheme
  const toggleTheme = React.useCallback(() => {
    const nextMode = resolvedTheme === "dark" ? "light" : "dark"

    setTheme(nextMode)
  }, [resolvedTheme, setTheme])

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
