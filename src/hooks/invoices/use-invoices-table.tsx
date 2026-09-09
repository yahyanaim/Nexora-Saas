import { useServerTable } from "../tables/use-server-table"
import { fetchInvoicesApi } from "@/lib/api/invoices-api"
import { Invoice } from "@/types/invoices"

export function useInvoicesTable() {
  return useServerTable<Invoice>({
    queryKey: "invoices",
    queryFn: fetchInvoicesApi,
  })
}
