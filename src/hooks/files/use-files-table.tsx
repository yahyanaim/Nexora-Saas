import { useServerTable } from "../tables/use-server-table"
import { fetchFilesApi } from "@/lib/api/files-api"
import { FileItem } from "@/types/files"

export function useFilesTable() {
  return useServerTable<FileItem>({
    queryKey: "files",
    queryFn: fetchFilesApi,
  })
}
