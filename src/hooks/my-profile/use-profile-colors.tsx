"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Heart,
  Star,
  Sun,
  Cloud,
  Droplet,
  Leaf,
  Flame,
  Crown,
  Moon,
  Music,
  Diamond,
  Zap,
} from "@/components/ui/carbon/icons"

// Colors palette with Lucide icons
export const PROFILE_COLORS = [
  { color: "#FF6B6B", name: "Red", icon: Heart },
  { color: "#FF9F43", name: "Orange", icon: Star },
  { color: "#FECA57", name: "Yellow", icon: Sun },
  { color: "#48DBFB", name: "Sky Blue", icon: Cloud },
  { color: "#0ABDE3", name: "Blue", icon: Droplet },
  { color: "#10AC84", name: "Green", icon: Leaf },
  { color: "#EE5A24", name: "Dark Orange", icon: Flame },
  { color: "#5F27CD", name: "Purple", icon: Crown },
  { color: "#341F97", name: "Dark Blue", icon: Moon },
  { color: "#FF6FB7", name: "Pink", icon: Music },
  { color: "#8395A7", name: "Gray", icon: Diamond },
  { color: "#222F3E", name: "Dark", icon: Zap },
]

export type ProfileColor = (typeof PROFILE_COLORS)[number]

interface UseProfileColorsOptions {
  defaultColor?: string
  storageKey?: string
}

export function useProfileColors(options: UseProfileColorsOptions = {}) {
  const {
    defaultColor = PROFILE_COLORS[0]!.color,
    storageKey = "profile-color",
  } = options

  // Get initial color from localStorage or default
  const getInitialColor = useCallback(() => {
    if (typeof window === "undefined") return defaultColor

    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const found = PROFILE_COLORS.find((c) => c.color === stored)
      if (found) return found.color
    }
    return defaultColor
  }, [defaultColor, storageKey])

  const [selectedColor, setSelectedColor] = useState<string>(getInitialColor)

  // Save to localStorage when color changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, selectedColor)
    }
  }, [selectedColor, storageKey])

  // Get full color object
  const getColorObject = useCallback((color: string): ProfileColor => {
    return PROFILE_COLORS.find((c) => c.color === color) || PROFILE_COLORS[0]!
  }, [])

  const currentColor = getColorObject(selectedColor)

  // Change color with validation
  const changeColor = useCallback((color: string) => {
    const exists = PROFILE_COLORS.some((c) => c.color === color)
    if (exists) {
      setSelectedColor(color)
    }
  }, [])

  // Reset to default
  const resetColor = useCallback(() => {
    setSelectedColor(defaultColor)
  }, [defaultColor])

  return {
    selectedColor,
    currentColor,
    changeColor,
    resetColor,
    colors: PROFILE_COLORS,
    isColorSelected: (color: string) => selectedColor === color,
  }
}
