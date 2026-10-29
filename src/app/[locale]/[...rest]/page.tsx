import { notFound } from "next/navigation"

// Any unknown address under a language shows the translated "not found" page
export default function CatchAllPage() {
  notFound()
}
