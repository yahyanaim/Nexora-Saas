import { redirect } from "next/navigation"

export default function BillingSuccessRedirect() {
  redirect("/dashboard/subscriptions")
}
