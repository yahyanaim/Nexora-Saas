import { z } from "zod"
import { AdminPermissionsPlatform } from "@/types/roles"

export function getRoleFormSchema() {
  return z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    permissions: z
      .array(z.nativeEnum(AdminPermissionsPlatform))
      .min(1, "Select at least one permission"),
  })
}

export type RoleFormValues = z.infer<ReturnType<typeof getRoleFormSchema>>
