/**
 * Data behind the public landing page that is the same in every language:
 * screens, links, logos, photos and the compliance exports. The words are in
 * copy/ (one file per language), in the same order as the lists here. Module,
 * role and plan facts come from the product (README, nexora-catalog); customer
 * quotes, logos and some figures are placeholders until marketing supplies
 * real ones.
 */

/** Languages the landing page is written in (the app has more) */
export const LANDING_LOCALES = [
  { code: "en", native: "English" },
  { code: "fr", native: "Français" },
  { code: "ar", native: "العربية" },
] as const

export const NAV_HREFS = ["#product", "#modules", "#compliance", "#pricing", "docs"] as const

/** Real full-page screens of the app (demo workspace), in public/landing */
export const SCREENS = [
  { id: "analytics", src: "/landing/screens/overview.webp", path: "overview", width: 2000, height: 2724 },
  { id: "projects", src: "/landing/screens/project-detail.webp", path: "projects/orbit-fleet-portal", width: 2000, height: 1264 },
  { id: "invoicing", src: "/landing/screens/client-invoices.webp", path: "client-invoices", width: 2000, height: 1940 },
  { id: "receivables", src: "/landing/screens/receivables.webp", path: "receivables", width: 2000, height: 1386 },
  { id: "forecast", src: "/landing/screens/forecast.webp", path: "forecast", width: 2000, height: 1662 },
  { id: "planning", src: "/landing/screens/resourcing.webp", path: "resourcing", width: 2000, height: 2315 },
]

/** Every captured screen, for the carousel */
export const GALLERY = [
  { src: "/landing/screens/deals.webp", width: 2000, height: 1667 },
  { src: "/landing/screens/team.webp", width: 2000, height: 1890 },
  { src: "/landing/screens/kpis.webp", width: 2000, height: 1869 },
  { src: "/landing/screens/client-invoices.webp", width: 2000, height: 1940 },
  { src: "/landing/screens/resourcing.webp", width: 2000, height: 2315 },
  { src: "/landing/screens/forecast.webp", width: 2000, height: 1662 },
  { src: "/landing/screens/receivables.webp", width: 2000, height: 1386 },
  { src: "/landing/screens/project-detail.webp", width: 2000, height: 1264 },
  { src: "/landing/screens/overview.webp", width: 2000, height: 2724 },
]

// Placeholder customer names until real logos are approved
export const LOGOS = [
  "Atlas Consulting",
  "Northwind Studio",
  "Dar Al Bina",
  "Marrakech Digital",
  "Tanger Conseil",
  "Orbit Labs",
  "Kasbah Creative",
  "Meridian IT",
]

// Placeholder testimonials: the photos are the app's demo avatars
export const TESTIMONIAL_PHOTOS = [
  "/avatars/maya-patel.jpg",
  "/avatars/marcus-vance.jpg",
  "/avatars/alex-morgan.jpg",
  "/avatars/sarah-chen.jpg",
  "/avatars/lucas-dubois.jpg",
  "/avatars/sophia-vance.jpg",
]

// Placeholder figures until real customer metrics are published
export const STAT_VALUES = ["9", "40+", "12", "99.9%"]

export const CODE_FILES = [
  {
    id: "einvoice",
    label: "e-invoice.xml",
    code: `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>FA-2026-00142</cbc:ID>
  <cbc:IssueDate>2026-10-13</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>MAD</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cbc:CompanyID schemeID="ICE">002873641000058</cbc:CompanyID>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="MAD">5 960.00</cbc:TaxAmount>
    <cbc:Percent>20</cbc:Percent>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="MAD">35 760.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`,
  },
  {
    id: "journal",
    label: "journal.csv",
    code: `journal;date;account;label;debit;credit
VT;2026-10-13;3421;Client Atlas Consulting;35760.00;
VT;2026-10-13;7124;Services rendered;;29800.00
VT;2026-10-13;4455;VAT collected 20%;;5960.00
BQ;2026-10-20;5141;Transfer FA-2026-00142;35760.00;
BQ;2026-10-20;3421;Client Atlas Consulting;;35760.00`,
  },
  {
    id: "vat",
    label: "vat-return.json",
    code: `{
  "period": "2026-Q3",
  "regime": "on_payment",
  "collected": 48210.00,
  "deductible": 12640.40,
  "credit_carried_in": 0,
  "due": 35569.60,
  "currency": "MAD"
}`,
  },
]

export const FOOTER_HREFS = [
  ["#modules", "#pricing", "#modules", "#"],
  ["docs", "docsAlt", "#", "#"],
  ["#", "#", "mailto:hello@nexora.ma", "#"],
]
