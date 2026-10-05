"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { ListSkeleton } from "@/components/ui/empty-state"

/** Sends a client contact who opened an ERP page back to the portal. */
export function PortalRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard/portal")
  }, [router])
  return (
    <div className="p-4 md:p-6">
      <ListSkeleton rows={3} />
    </div>
  )
}
