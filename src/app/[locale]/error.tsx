"use client"

import { useEffect } from "react"
import { ErrorScreen } from "@/components/shared/error-screen"
import { logger } from "@/lib/logger"

export default function ErrorBoundaryPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("Unhandled locale error boundary caught:", error)
  }, [error])

  return <ErrorScreen kind="error" scope="app" error={error} reset={reset} />
}
