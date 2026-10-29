import { ErrorScreen } from "@/components/shared/error-screen"

export default function NotFound() {
  return <ErrorScreen kind="notFound" scope="app" />
}
