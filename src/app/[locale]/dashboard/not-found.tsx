import { ErrorScreen } from "@/components/shared/error-screen"

export default function DashboardNotFound() {
  return <ErrorScreen kind="notFound" scope="dashboard" />
}
