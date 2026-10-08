import { seatLimit, isoDay } from "@/lib/platform/customer-lifecycle"
import type { CustomerAccount } from "@/types/platform-customers"
import { PLATFORM_WS } from "./platform-console-api"
import { customersCollection, seatsInUse } from "./platform-customers-api"
import { listSubscriptionsApi } from "./platform-billing-api"

/**
 * SUB-09: when a company uses every seat its plan includes, its administrator
 * gets an in-app notice and the customer page shows it. One notice per
 * billing period: the check runs whenever seats are read, and a notice already
 * sent for the current period is not sent again.
 */
export async function checkSeatsFullApi(today = isoDay(new Date())): Promise<CustomerAccount[]> {
  const subs = await listSubscriptionsApi()
  const sent: CustomerAccount[] = []
  for (const c of customersCollection.list(PLATFORM_WS)) {
    if (c.status !== "active" && c.status !== "payment_overdue" && c.status !== "trial") continue
    const limit = seatLimit(c, today)
    if (limit === null) continue
    const used = await seatsInUse(c)
    if (used < limit) continue
    const period = subs.find((s) => s.customerId === c.id)?.periodStart ?? c.trialEndsOn ?? today.slice(0, 7)
    if (c.seatsFullNotice?.period === period) continue
    sent.push(customersCollection.update(PLATFORM_WS, c.id, { seatsFullNotice: { period, at: new Date().toISOString(), used, limit } }))
  }
  return sent
}

/** The notice a company still sees: sent for this period and still true today. */
export async function seatsFullNoticeFor(c: CustomerAccount, today = isoDay(new Date())) {
  if (!c.seatsFullNotice) return null
  const limit = seatLimit(c, today)
  if (limit === null) return null
  const used = await seatsInUse(c)
  return used >= limit ? { ...c.seatsFullNotice, used, limit } : null
}
