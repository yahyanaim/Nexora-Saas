"use client"

import { useEffect } from "react"
import { ErrorScreen } from "@/components/shared/error-screen"
import { logger } from "@/lib/logger"

export default function DashboardErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Dashboard error boundary caught error:", error)
  }, [error])

  return <ErrorScreen kind="error" scope="dashboard" error={error} reset={reset} />
}
