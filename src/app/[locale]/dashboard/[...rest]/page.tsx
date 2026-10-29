import { notFound } from "next/navigation"

// An unknown dashboard address keeps the shell and offers the person's own home page
export default function DashboardCatchAllPage() {
  notFound()
}
