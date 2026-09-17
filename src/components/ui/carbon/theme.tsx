"use client"

import React from "react"
import { Theme } from "@carbon/react"

interface CarbonThemeWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * Enterprise Carbon Design System Theme Wrapper.
 * Enforces unified 'g100' dark theme with no theme mixing.
 */
export function CarbonThemeWrapper({
  children,
  className = "",
}: CarbonThemeWrapperProps) {
  return (
    <Theme theme="g100" className={`cds--g100 ${className}`}>
      {children}
    </Theme>
  )
}
