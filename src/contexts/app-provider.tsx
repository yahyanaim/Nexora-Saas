"use client"
import { useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { AuthGuardProvider } from "./auth-provider"

const ProviderContexts = ({ children }: any) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthGuardProvider>
            {children}
            <Toaster position="top-center" />
          </AuthGuardProvider>
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  )
}

export default ProviderContexts
