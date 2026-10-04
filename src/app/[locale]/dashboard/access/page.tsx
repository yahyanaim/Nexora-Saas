import AccessPage from "@/components/shared/work-hr-chunks/access-page"
import { RequirePermission } from "@/components/shared/platform-only"
import { AdminPermissionsPlatform } from "@/types/roles"

export default function Page() {
  return (
    <RequirePermission permission={AdminPermissionsPlatform.EMPLOYEES_UPDATE}>
      <AccessPage />
    </RequirePermission>
  )
}
