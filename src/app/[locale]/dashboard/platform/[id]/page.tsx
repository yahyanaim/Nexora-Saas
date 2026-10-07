import CustomerAccountPage from "@/components/shared/platform-chunks/customer-account-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerAccountPage customerId={id} />
}
