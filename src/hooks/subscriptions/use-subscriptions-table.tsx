import { fetchSubscriptionsApi } from "@/lib/api/subscriptions-api"
import { useServerTable } from "../tables/use-server-table"
import { Subscription } from "@/types/subscriptions"

export function useSubscriptionsTable() {
  return useServerTable<Subscription>({
    queryKey: "subscriptions",
    queryFn: fetchSubscriptionsApi,
  })
}
