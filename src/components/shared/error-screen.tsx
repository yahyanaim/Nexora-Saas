"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, ChevronDown, ChevronUp, FileQuestion, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

interface Props {
  kind: "error" | "notFound"
  /** Inside the dashboard the way back is the person's own home page (`/dashboard` sends each role to theirs) */
  scope: "app" | "dashboard"
  error?: Error & { digest?: string }
  reset?: () => void
}

// The message and stack can name files, queries or data: only developers see them
const SHOW_DETAILS = process.env.NODE_ENV !== "production"

/** The error and "not found" screens, in the reader's language (audit C-04). */
export function ErrorScreen({ kind, scope, error, reset }: Props) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const Icon = kind === "error" ? AlertTriangle : FileQuestion
  const home = scope === "dashboard" ? "/dashboard" : "/"

  return (
    <div className={scope === "dashboard" ? "flex min-h-[400px] w-full items-center justify-center p-6 text-center" : "flex min-h-[60vh] w-full items-center justify-center p-6 text-center"}>
      <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className={kind === "error" ? "mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive" : "mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"}>
          <Icon className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-foreground">{t(kind === "error" ? "er_errorTitle" : "er_notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(kind === "notFound" ? "er_notFoundBody" : scope === "dashboard" ? "er_errorBodyDashboard" : "er_errorBody")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {reset && (
            <Button size="sm" onClick={() => reset()} className="gap-2">
              <RefreshCw className="size-4" aria-hidden />
              {t("er_tryAgain")}
            </Button>
          )}
          <Button asChild variant={reset ? "outline" : "default"} size="sm" className="gap-2">
            <Link href={home}>
              <Home className="size-4" aria-hidden />
              {t(scope === "dashboard" ? "er_myHome" : "er_home")}
            </Link>
          </Button>
        </div>

        {error?.digest && <p className="mt-4 text-xs text-muted-foreground tabular-nums">{t("er_reference", { digest: error.digest })}</p>}

        {SHOW_DETAILS && error?.message && (
          <div className="mt-6 border-t border-border pt-4 text-start">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>{t("er_details")}</span>
              {open ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
            </button>
            {open && (
              <div className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs text-foreground" dir="ltr">
                <p className="font-semibold text-destructive">{error.message}</p>
                {error.stack && <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{error.stack}</pre>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
