"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { ListSkeleton } from "@/components/ui/empty-state"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { homePathFor } from "@/lib/permissions/home"

/** /dashboard opens the signed-in person's home page (the first page their role can open). */
export default function DashboardIndexPage() {
  const { authedUser } = useAuthGuard()
  const router = useRouter()
  useEffect(() => {
    if (authedUser) router.replace(homePathFor(authedUser))
  }, [authedUser, router])
  return (
    <div className="p-4 md:p-6">
      <ListSkeleton rows={3} />
    </div>
  )
}
