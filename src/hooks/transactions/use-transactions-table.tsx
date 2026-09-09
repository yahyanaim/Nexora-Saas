import { fetchTransactionsApi } from "@/lib/api/transactions-api"
import { useServerTable } from "../tables/use-server-table"
import { Transaction } from "@/types/transactions"

export function useTransactionsTable() {
  return useServerTable<Transaction>({
    queryKey: "transactions",
    queryFn: fetchTransactionsApi,
  })
}
