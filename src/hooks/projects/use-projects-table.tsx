import { useServerTable } from "../tables/use-server-table"
import { fetchProjectsApi } from "@/lib/api/projects-api"
import { Project } from "@/types/projects"

export function useProjectsTable() {
  return useServerTable<Project>({
    queryKey: "projects",
    queryFn: fetchProjectsApi,
  })
}
