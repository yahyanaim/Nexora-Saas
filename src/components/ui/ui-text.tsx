"use client"

import { createContext, useContext } from "react"

/**
 * The few words the UI kit says to screen readers (close, loading…). English
 * by default; the app layout passes them in the reader's language, so the kit
 * stays usable without the translation provider (tests, isolated stories).
 */
const DEFAULTS = {
  close: "Close",
  closePanel: "Close panel",
  loading: "Loading...",
  toggleTheme: "Toggle theme",
  selectDate: "Select date",
}

export type UiText = typeof DEFAULTS

const UiTextContext = createContext<UiText>(DEFAULTS)

export const UiTextProvider = UiTextContext.Provider

export const useUiText = () => useContext(UiTextContext)
