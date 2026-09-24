import Link from "next/link"
import { FileQuestion, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-foreground">
          404 - Page Not Found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved to another location.
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="default" size="sm" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
