import apiClient, { shouldUseDemoFallback } from "@/lib/myapi/client"
import { DEMO_WORKSPACES } from "@/lib/workforce/demo-seed"
import type { Workspace } from "@/types/workforce"

/**
 * The companies the signed-in person can open (API audit §4.1). The
 * workspace switcher reads this list; in the demo it is the seeded companies.
 */
export async function listMyWorkspacesApi(): Promise<Workspace[]> {
  try {
    const { data } = await apiClient.get<Workspace[]>("/me/workspaces")
    if (Array.isArray(data)) return data
  } catch (error) {
    if (shouldUseDemoFallback(error)) return DEMO_WORKSPACES
    throw error
  }
  return DEMO_WORKSPACES
}
