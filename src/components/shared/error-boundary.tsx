"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

/**
 * Enterprise React Error Boundary.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs the error, and displays a resilient fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // In production, send to telemetry (Sentry, Datadog, etc.)
    console.error("Uncaught application error:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
    this.props.onReset?.()
  }

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred while rendering this section. You can try
              refreshing the view or return to the dashboard.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReset}
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
                    window.location.href = "/dashboard"
                  }
                }}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>

            {this.state.error && (
              <div className="mt-6 border-t border-border pt-4 text-left">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {this.state.error.toString()}
                    {"\n"}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
