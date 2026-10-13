import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "Nexora: the ERP for service companies",
  description:
    "People, clients, projects, hours, invoices, cash and profit in one place. Built for agencies, consultancies, studios and IT services, with Moroccan compliance built in.",
}

const page = () => {
  return <LandingPage />
}

export default page
