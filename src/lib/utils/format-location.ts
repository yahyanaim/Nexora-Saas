import { SessionLocation } from "@/types/sessions"

export function formatLocation(location?: SessionLocation | null): string {
  if (!location) return "Unknown"
  const parts = [location.city, location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Unknown"
}
