import Link from "next/link"
import { FileQuestion, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-foreground">
          Dashboard Page Not Found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The requested dashboard view or resource could not be found.
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="default" size="sm" className="gap-2">
            <Link href="/dashboard/overview">
              <LayoutDashboard className="h-4 w-4" />
              Back to Overview
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
