/**
 * Copy for the public landing page. Module, role and plan facts come from the
 * product (README, nexora-catalog); customer quotes, logos and some figures are
 * placeholders until marketing supplies real ones.
 */

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Modules", href: "#modules" },
  { label: "Compliance", href: "#compliance" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/documentation/doc.html" },
]

/** Real full-page screens of the app (demo workspace), in public/landing */
export const SCREENS = [
  {
    id: "analytics",
    label: "Analytics",
    title: "Profit you can explain",
    body: "Revenue earned, gross margin, utilization and cash collected against the previous period, with the reason behind each number.",
    src: "/landing/screens/overview.webp",
    path: "overview",
    width: 2000,
    height: 2724,
  },
  {
    id: "projects",
    label: "Projects",
    title: "Projects that know their budget",
    body: "Board, list, milestones, Gantt and team views. Health, budget used and progress on every project, live.",
    src: "/landing/screens/project-detail.webp",
    path: "projects/orbit-fleet-portal",
    width: 2000,
    height: 1264,
  },
  {
    id: "invoicing",
    label: "Invoicing",
    title: "Invoices from approved hours",
    body: "What is ready to bill, outstanding and overdue, with DGI e-invoice status on every invoice.",
    src: "/landing/screens/client-invoices.webp",
    path: "client-invoices",
    width: 2000,
    height: 1940,
  },
  {
    id: "receivables",
    label: "Receivables",
    title: "Know who owes you",
    body: "Open balances by age, three-level reminders and the rules that send them.",
    src: "/landing/screens/receivables.webp",
    path: "receivables",
    width: 2000,
    height: 1386,
  },
  {
    id: "forecast",
    label: "Forecast",
    title: "Next month’s cash, today",
    body: "Income expected each month from invoices, recurring billing, booked work and weighted deals.",
    src: "/landing/screens/forecast.webp",
    path: "forecast",
    width: 2000,
    height: 1662,
  },
  {
    id: "planning",
    label: "Planning",
    title: "Capacity before it is a problem",
    body: "Who is booked on what for the next 12 weeks, against capacity, leave and public holidays.",
    src: "/landing/screens/resourcing.webp",
    path: "resourcing",
    width: 2000,
    height: 2315,
  },
]

/** Every captured screen, for the carousel */
export const GALLERY = [
  { src: "/landing/screens/deals.webp", width: 2000, height: 1667, caption: "Deals pipeline" },
  { src: "/landing/screens/team.webp", width: 2000, height: 1890, caption: "Team dashboard" },
  { src: "/landing/screens/kpis.webp", width: 2000, height: 1869, caption: "KPIs per person" },
  { src: "/landing/screens/client-invoices.webp", width: 2000, height: 1940, caption: "Client invoices" },
  { src: "/landing/screens/resourcing.webp", width: 2000, height: 2315, caption: "Resource planning" },
  { src: "/landing/screens/forecast.webp", width: 2000, height: 1662, caption: "Revenue forecast" },
  { src: "/landing/screens/receivables.webp", width: 2000, height: 1386, caption: "Receivables" },
  { src: "/landing/screens/project-detail.webp", width: 2000, height: 1264, caption: "Project board" },
  { src: "/landing/screens/overview.webp", width: 2000, height: 2724, caption: "Business analytics" },
]

export const FOOTER_TAGLINE =
  "Nexora is the ERP for service companies. It connects the people you hire and the clients you serve to your projects, the hours you work, the invoices you send, the cash you collect and the profit you keep."

export const CHAIN = [
  { step: "01", title: "People", body: "Roles, rates, capacity and real cost per hour." },
  { step: "02", title: "Clients", body: "Legal details, rate cards, contracts and contacts." },
  { step: "03", title: "Projects", body: "Hourly, fixed-price, retainer or internal." },
  { step: "04", title: "Hours", body: "Timesheets, timer, approvals, frozen rates." },
  { step: "05", title: "Invoices", body: "From approved hours, milestones or quotes." },
  { step: "06", title: "Cash", body: "Payments, bank import, reminders, aging." },
  { step: "07", title: "Profit", body: "Margin per project, client and person." },
]

export const REPLACES = [
  "the timesheet spreadsheet",
  "the separate invoicing tool",
  "the HR file",
  "the “who owes us money” list",
  "the end-of-month profitability workbook",
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

export const FEATURES = [
  {
    tag: "TIME",
    title: "Hours that turn into invoices",
    body: "Weekly timesheet, timer and quick log with 15-minute rounding. Submit, approve or send back. Rates are frozen at approval, so the invoice never drifts.",
  },
  {
    tag: "INVOICING",
    title: "Invoices and quotes in one click",
    body: "Bill from approved hours, milestones, retainers or deposits. Gapless numbering, several tax rates, withholding, partial payments, credit notes and a branded PDF.",
  },
  {
    tag: "PROJECTS",
    title: "Projects that know their budget",
    body: "Board, list, Gantt and milestones with dependencies. Automatic health, budget alerts at 80% and 100%, change orders and a frozen profit snapshot at close.",
  },
  {
    tag: "CASH",
    title: "Know who owes you, and since when",
    body: "Receivables by age, three-level reminders, recurring invoices and bank CSV import that matches transfers to open invoices automatically.",
  },
  {
    tag: "PLANNING",
    title: "Capacity before it is a problem",
    body: "Book people or open roles by week, see a 12-week forecast with leave and holidays taken out, and spot over-booked people at a glance.",
  },
  {
    tag: "ANALYTICS",
    title: "Profit, explained by Victor",
    body: "Revenue, margin, utilization and cash collected, with a revenue bridge, clients at risk, 12 standard reports and the Victor assistant.",
  },
]

export const MODULES = [
  "My work",
  "Team",
  "Employees",
  "Org chart",
  "Clients",
  "Projects & tasks",
  "Timesheets",
  "Invoicing",
  "Quotes (devis)",
  "Client portal",
  "Recurring invoices",
  "Receivables",
  "Suppliers & bills",
  "Expenses",
  "Deals pipeline",
  "Revenue forecast",
  "Resource planning",
  "Performance reviews",
  "Bank import",
  "Revenue recognition",
  "KPIs",
  "Reports",
  "Mobile app (PWA)",
  "Victor assistant",
]

export const ROLES = [
  { role: "Admin", body: "Everything: settings, overheads, KPI targets, costs and margins. Never approves their own items." },
  { role: "Manager", body: "Projects, clients and the team’s time, leave and expenses to approve. No invoices or costs." },
  { role: "Accountant", body: "Quotes, invoices, e-invoices, receivables, suppliers, VAT return and the journal." },
  { role: "Employee", body: "My work, their own timesheet, leave, expenses, reviews and KPIs. Nothing else." },
  { role: "Client", body: "The portal: their projects and milestones, invoices and quotes, approvals." },
]

export const CODE_TABS = [
  {
    id: "einvoice",
    label: "e-invoice.xml",
    caption: "Every issued invoice gets a DGI e-invoice file (UBL 2.1).",
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
    caption: "Sales, purchases, bank and cash journals on the CGNC chart of accounts.",
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
    caption: "Monthly or quarterly VAT return, on payment or on invoicing, credit carried forward.",
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

export const COMPLIANCE = [
  "ICE, IF, RC, Patente and CNSS checked for Moroccan formats",
  "DGI e-invoice file per invoice, corrected only by credit note",
  "VAT due on payment or invoicing, monthly or quarterly",
  "CGNC journal (VT, HA, BQ, CA, OD) exported to CSV",
  "Real cost per hour with CNSS, AMO and training tax",
  "24-digit RIB on suppliers, bank statements in Moroccan formats",
]

// Placeholder figures until real customer metrics are published
export const STATS = [
  { value: "9", label: "languages, incl. Arabic" },
  { value: "40+", label: "modules in one app" },
  { value: "12", label: "standard reports" },
  { value: "99.9%", label: "uptime commitment" },
]

// Placeholder testimonials (photos are the app's demo avatars)
export const TESTIMONIALS = [
  {
    quote: "We closed five spreadsheets the week we moved. Invoices now come straight from approved hours, and month-end takes an afternoon.",
    name: "Nadia El Fassi",
    photo: "/avatars/maya-patel.jpg",
    role: "Managing Director, Marrakech Digital",
  },
  {
    quote: "The DGI e-invoice file and the VAT return used to be a whole day with our accountant. Now it is an export.",
    name: "Hicham Benjelloun",
    photo: "/avatars/marcus-vance.jpg",
    role: "CFO, Dar Al Bina Ingénierie",
  },
  {
    quote: "For the first time I know which projects actually make money, per person and per phase, before the project ends.",
    name: "Alex Morgan",
    photo: "/avatars/alex-morgan.jpg",
    role: "Partner, Atlas Consulting",
  },
  {
    quote: "Our team logs time from their phones and approvals take minutes. Nothing gets billed late any more.",
    name: "Sarah Chen",
    photo: "/avatars/sarah-chen.jpg",
    role: "Operations Lead, Northwind Studio",
  },
  {
    quote: "The client portal ended the ‘where are we on this?’ emails. Clients approve milestones and download invoices on their own.",
    name: "Yassine Alaoui",
    photo: "/avatars/lucas-dubois.jpg",
    role: "Project Director, Orbit Labs",
  },
  {
    quote: "Resource planning showed us who was over-booked three weeks before it became a problem. That alone paid for it.",
    name: "Lina Moreau",
    photo: "/avatars/sophia-vance.jpg",
    role: "COO, Kasbah Creative",
  },
]

export const FAQ = [
  {
    q: "Who is Nexora for?",
    a: "Service companies: agencies, consultancies, design and video studios, IT services and engineering offices. Anyone who sells time and expertise and needs to know if it pays.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every workspace starts with a 14-day trial with all Business features. You choose your plan when you are ready; nothing is charged before.",
  },
  {
    q: "How do I pay?",
    a: "Bank transfer is the default, with card payment available. Enterprise customers get 30-day transfer terms. Prices are in MAD before 20% VAT.",
  },
  {
    q: "Does it work outside Morocco?",
    a: "Yes. Nexora handles multiple currencies and nine languages. Moroccan compliance (ICE, DGI e-invoices, CGNC journal) switches on with a Moroccan company profile.",
  },
  {
    q: "Can my clients see their projects?",
    a: "Each client contact can get a portal login to follow progress, approve milestones and download invoices and quotes. Nothing else is visible to them.",
  },
  {
    q: "Can I get my data out?",
    a: "Always. Every report exports to Excel, CSV and PDF, and workspace admins can request a full data export from My subscription.",
  },
]

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Modules", href: "#modules" },
      { label: "Pricing", href: "#pricing" },
      { label: "Mobile app", href: "#modules" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/documentation/doc.html" },
      { label: "Documentation (العربية)", href: "/documentation/doc-ar.html" },
      { label: "Help center", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "mailto:hello@nexora.ma" },
      { label: "Privacy", href: "#" },
    ],
  },
]
