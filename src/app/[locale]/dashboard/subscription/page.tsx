import SubscriptionPage from "@/components/shared/work-settings-chunks/subscription-page"
import { RequirePermission } from "@/components/shared/platform-only"
import { AdminPermissionsPlatform } from "@/types/roles"

export default function Page() {
  return (
    <RequirePermission permission={AdminPermissionsPlatform.ROLES_READ}>
      <SubscriptionPage />
    </RequirePermission>
  )
}
