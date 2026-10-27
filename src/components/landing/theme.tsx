"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "@/components/ui/carbon/icons"
import { useTheme } from "@/hooks/use-theme"
import { useHasMounted } from "@/hooks/use-has-mounted"
import s from "./landing.module.css"

/** True while the page is in dark mode (`html.dark`); the canvases redraw in their dark palette. */
export function useLandingDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains("dark"))
    read()
    const watch = new MutationObserver(read)
    watch.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => watch.disconnect()
  }, [])
  return dark
}

/** Sun / moon switch in the nav: the same light / dark choice as the app. */
export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const { isDark, setTheme } = useTheme()
  // the theme is only known in the browser
  const mounted = useHasMounted()
  const dark = mounted && isDark
  return (
    <button
      type="button"
      className={s.langBtn}
      aria-label={dark ? toLight : toDark}
      title={dark ? toLight : toDark}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className={s.langIcon} /> : <Moon className={s.langIcon} />}
    </button>
  )
}
