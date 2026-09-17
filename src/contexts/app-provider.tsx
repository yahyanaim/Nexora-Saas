"use client"
import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { AuthGuardProvider } from "./auth-provider"
import { ErrorBoundary } from "@/components/shared/error-boundary"

const ProviderContexts = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthGuardProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster position="top-center" />
          </AuthGuardProvider>
        </TooltipProvider>
      </ThemeProvider>
      {process.env.NEXT_PUBLIC_SHOW_DEVTOOLS === "true" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  )
}

export default ProviderContexts
