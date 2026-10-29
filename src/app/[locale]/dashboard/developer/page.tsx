import { notFound } from "next/navigation"
import DeveloperPage from "@/components/shared/developer-chunks/developer-page"
import { isDemoMode } from "@/lib/auth/demo-mode"

export default function Page() {
  // The proxy already answers 404 outside demo mode; this guards direct renders.
  if (!isDemoMode()) notFound()
  return <DeveloperPage />
}
