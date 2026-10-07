import type { MetadataRoute } from "next"

/**
 * Web app manifest (Phase 6h.3): lets phones install Nexora on the home
 * screen. Paths have no locale: the locale routing adds the person's one.
 */
export default function manifest(): MetadataRoute.Manifest {
  const icon = [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  return {
    id: "/",
    name: "Nexora ERP",
    short_name: "Nexora",
    description: "Time, projects, invoices and planning for service companies.",
    start_url: "/dashboard/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7fb",
    theme_color: "#2684ff",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Start timer", short_name: "Timer", url: "/dashboard/today?timer=1", icons: icon },
      { name: "Log time", short_name: "Time", url: "/dashboard/timesheets", icons: icon },
      { name: "New expense", short_name: "Expense", url: "/dashboard/expenses?new=1", icons: icon },
    ],
  }
}
