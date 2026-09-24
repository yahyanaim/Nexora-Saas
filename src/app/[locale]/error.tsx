"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundaryPage({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error("Unhandled locale error boundary caught:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page. You can try refreshing
          or return to the home page.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => reset()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/"
              }
            }}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>

        {error.message && (
          <div className="mt-6 border-t border-border pt-4 text-left">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Error Details</span>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showDetails && (
              <div className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 font-mono text-xs text-foreground">
                <p className="font-semibold text-destructive">{error.message}</p>
                {error.digest && (
                  <p className="mt-1 text-muted-foreground">Digest: {error.digest}</p>
                )}
                {error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-[10px] text-muted-foreground">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
