# Nexora ERP — What to add before the backend (research, October 2026)

## Why this report

Before Phase 7 (the server), we looked at two things on the web:
1. **What Moroccan law requires** from software that invoices and pays people.
2. **What the leading professional-services tools** (PSA: Kantata, Productive, Scoro, BigTime, Teamwork, Odoo) offer that Nexora doesn't.

Each gap below says **why it matters**, **how big it is**, and **whether it needs the server** or can be built now in the shared business logic (which the server will reuse).

**Bottom line:** Nexora already covers more than most PSA tools in one product (CRM, quotes, invoicing with VAT/withholding, time, leave, HR documents, reviews, KPIs, client portal). The main gaps are **(1) Moroccan e-invoicing, which is now mandatory in phases**, **(2) what the accountant needs (VAT on payments received, an accounting journal, supplier bills)** and **(3) forward-looking planning (resource bookings, pipeline, revenue forecast)**.

---

## 1. Moroccan compliance

### 1.1 Mandatory DGI e-invoicing — the top priority
- **What the law says.**
  - B2B e-invoicing is being made mandatory in phases. Large companies (turnover over MAD 200 M) started on **1 January 2026**. Medium companies follow from **July 2026**, and SMEs and auto-entrepreneurs above MAD 500,000 from **January 2027**.
  - Sources differ slightly on the exact thresholds of the middle phase.
- **The "clearance" model.**
  - Each invoice must be produced as structured XML in **UBL 2.1** or **UN/CEFACT CII** format (a PDF is not enough).
  - It must be signed and timestamped, and **sent to the DGI platform for validation before it goes to the client**.
  - The DGI returns a unique identifier.
  - The ICE of both seller and buyer is required, and invoices must be archived for **10 years**.
- **Where Nexora stands.**
  - Ready: gapless numbering at issue, ICE on the company and on clients, VAT per rate, withholding, credit notes, a period lock.
  - Missing: the XML file, the clearance step, the DGI identifier and status on the invoice, buyer ICE made **mandatory** for B2B, and 10-year archiving.
- **What to build.**
  - **Now (front end, pure logic):**
    - a UBL 2.1 generator from an issued invoice, credit notes included;
    - buyer ICE required for Moroccan B2B clients;
    - fields for `dgiId`, `dgiStatus` (pending, validated, rejected) and the rejection reason;
    - an "e-invoice" badge and a download button for the XML.
  - **Server:**
    - the signature and timestamp;
    - the API connection to the DGI platform, with retries and rejection handling;
    - immutable 10-year storage.
- **Why first:** without it, Nexora can't be sold to Moroccan companies in the mandated phases, which by 2027 means almost all of them.

### 1.2 VAT due when payment is collected, and the VAT return
- **What the law says.** For services, VAT is due when the price is **collected**, by default (CGI article 95). Taxing at invoicing ("débits") is an option the company declares in writing. Companies also file a list of deductible VAT on their purchases with each return.
- **Where Nexora stands.** Reports show invoiced VAT; nothing shows the VAT due on payments received in a period, or deductible VAT.
- **What to build now:**
  - a company setting "VAT on collection / on invoicing";
  - a **VAT report** per month or quarter: VAT collected on payments received (pro rata per payment and rate), deductible VAT from expenses and supplier bills, and VAT due;
  - an Excel/PDF export for the accountant.
- **Why:** it is the first thing a Moroccan accountant asks for; today they would recompute it by hand.

### 1.3 Accounting export (CGNC journal)
- **The need.** Most service firms keep their books with an accountant or in Sage/Odoo. They need invoices, payments, credit notes and expenses as **journal entries** using Moroccan chart-of-accounts accounts (clients, service sales, VAT invoiced, VAT recoverable, bank…).
- **What to build now:**
  - a mapping of Nexora events to CGNC accounts, editable in Settings;
  - a "Journal" export (CSV/Excel) per period;
  - entries locked by the existing period lock.
- **Why:** it removes double entry, and accountants are the ones who recommend software to their clients.

### 1.4 Supplier bills and subcontractors (accounts payable)
- **The gap.** Service firms buy freelancers, subcontractors and software. Nexora tracks employee expenses but not **supplier invoices**, so subcontracting costs are missing from project profit, and deductible VAT is missing from the VAT report.
- **What to build now:**
  - suppliers, and supplier bills linked to projects (cost, VAT, due date, payment status);
  - withholding on payments to individuals, where it applies;
  - bills feed profit, the VAT report and the journal.

### 1.5 Payroll inputs (CNSS, AMO, IR)
- **What the law says.**
  - Employer CNSS contributions are about **21.09%**, employee contributions **6.74%**, and part of them are capped at **MAD 6,000** a month.
  - Declarations are monthly on **Damancom** before the 10th, with penalties for lateness.
  - The IR brackets were lowered from 2025 (exempt threshold MAD 40,000 a year, top rate 37%).
- **Where Nexora stands.** Nexora has cost rates, leave and hours, but no payroll.
- **Recommendation:** don't build a full payroll yet. Build:
  - (a) a **loaded cost** calculator that turns gross salary into a cost per hour including employer charges, so profitability is right;
  - (b) a **monthly payroll export** (days worked, leave taken, overtime, expenses to reimburse) for the payroll provider or Sage Paie.

  A full payslip, IR and Damancom file can come later as a module.

### 1.6 Personal data (law 09-08, CNDP)
- **What the law says.**
  - Processing employee and client data requires **declarations to the CNDP**.
  - Moving the data **abroad requires prior authorization**.
  - People's rights (access, correction, deletion) must be respected.
- **Impact on the backend:**
  - Choose **hosting in Morocco**, or plan the CNDP transfer authorization if hosting in the EU.
  - Add a privacy notice and the CNDP declaration number in the app.
  - Add a "my data" export (the workspace export already exists) and a deletion request flow.
  - Keep the audit log on the server.

### 1.7 Electronic signature (law 43-20)
- **What the law says.** It defines simple, advanced and qualified electronic signatures; under its conditions an electronic signature has the same value as a handwritten one.
- **What to build:**
  - **now:** a "simple" signature on quotes and contracts in the client portal (typed name, checkbox, timestamp, and the IP from the server), with the signed PDF kept;
  - **later:** a connection to an accredited provider for advanced or qualified signatures.

### 1.8 Paying invoices online
- **The need.** Clients would pay faster from the portal or a payment link.
- **The market.** CMI processes card payments in Morocco. Since a competition decision in October 2024 it is becoming a technical platform open to all acquirers, so integrate through an acquirer or PSP rather than CMI directly.
- **What to build (server):** a payment link per invoice, and automatic recording of the payment when it succeeds.

---

## 2. Gaps compared with the leading PSA tools

| # | Feature | What competitors do | Nexora today | Why it matters | Server needed? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2.1 | **Resource bookings and capacity forecast** | Book people on future weeks (hours or %), **tentative bookings** for deals not yet signed, **placeholders** ("a senior developer"), skill-based search, capacity versus demand weeks ahead (Productive, Kantata) | Workload of logged hours and tasks; skills on employees | Utilization is the main profit lever; managers can't see next month's gaps today | No (logic now) |
| 2.2 | **Sales pipeline (deals)** | Opportunities with stage, value, probability and expected start, feeding the resource and revenue forecast (Scoro) | Quotes only | Forecasts and hiring decisions start before the quote | No |
| 2.3 | **Revenue forecast and revenue recognition** | Forecast from bookings, retainers and the weighted pipeline; recognize fixed-price revenue over time or on a date; work in progress and unbilled revenue (Productive, BigTime) | Earned revenue so far; no forward view | Directors and banks ask "what will next quarter look like?" | No |
| 2.4 | **Budget by phase and change orders** | Budgets per phase or milestone; change orders that raise the budget with client approval | One budget per project | Scope creep is the main reason fixed-price projects lose money | No |
| 2.5 | **Mobile time and receipts** | Mobile app or installable web app, timer, receipt photo with OCR | Responsive web | Time logged late is time lost; receipts get lost | Partly (OCR on the server) |
| 2.6 | **Calendar and e-mail integration** | Google/Outlook calendar suggestions for time; send invoices and reminders by e-mail; Slack/Teams notifications | None (no server) | Less typing; reminders actually sent | Yes |
| 2.7 | **Bank reconciliation** | Import bank statements (CSV or feeds), match payments to invoices automatically | Payments entered by hand | Saves the accountant hours each month | Partly (CSV import now) |
| 2.8 | **AI assistance** | Timesheet autofill from calendar and activity; project risk prediction; draft invoice text and status reports. Vendors claim 30–50% less timesheet admin | Victor assistant on analytics | Strong selling point if grounded in the data | Yes (model calls on the server) |
| 2.9 | **Automations** | Rules such as "when a quote is accepted, create the project and notify"; scheduled reports | Some built-in flows; scheduled reports pending | Saves repetitive clicks | Yes |
| 2.10 | **Client satisfaction** | A CSAT/NPS survey at milestones and at project close, in the portal | None | An early warning for churn; useful in reviews | No |
| 2.11 | **Multi-company** | Several legal entities, consolidated reports, inter-company invoicing | One company per workspace | Groups and holdings | Yes (data model) |
| 2.12 | **Public API, webhooks, SSO, 2FA** | REST API, webhooks, Google/Microsoft sign-in, two-factor authentication | None (front end only) | Enterprise buyers and integrators require them | Yes |

---

## 3. Recommended order

### Before the backend (front end and shared logic, about 2–3 phases)
These shape the **data model** the server must store, so building them first avoids database migrations later:

1. **Phase 6e — Moroccan compliance, data side:**
   - UBL 2.1 e-invoice XML with the DGI fields and status;
   - buyer ICE required for B2B;
   - "VAT on collection" setting and the VAT report;
   - the CGNC journal export.
2. **Phase 6f — Purchases:**
   - suppliers and supplier bills linked to projects;
   - their VAT feeding the VAT report;
   - loaded cost from gross salary;
   - the monthly payroll export.
3. **Phase 6g — Forward planning:**
   - resource bookings (including tentative ones and placeholders) and the capacity forecast;
   - the deals pipeline;
   - the revenue forecast and recognition schedule;
   - budgets by phase and change orders.

### With the backend (Phase 7)
- DGI clearance API, signature and timestamp, 10-year archive.
- E-mail sending, payment links, bank statement import, calendar integration.
- Simple e-signature on quotes and contracts, with a server timestamp and IP.
- Hosting choice under law 09-08 and the CNDP declarations.
- SSO, 2FA, public API and webhooks.
- Scheduled reports, automations, AI timesheet suggestions and risk alerts.

### Later
Full payroll (payslips, IR, Damancom file), multi-company consolidation, advanced or qualified e-signature, client satisfaction surveys, OCR.

---

## Sources

**DGI e-invoicing**
- [Sage Maroc — e-invoicing reform](https://www.sage.com/fr-ma/blog/facturation-electronique-maroc-2026/)
- [Hisab — DGI 2026 guide](https://hisab.ma/fr/docs/mandate-2026)
- [Experio — calendar and obligations](https://experio.ma/facturation-electronique-maroc-2026-guide-conformite/)
- [Oasis Techno Cloud — B2B e-invoicing](https://oasistechnocloud.com/blog/facturation-electronique-b2b-maroc/)
- [Forum for the Future — 2026 obligation](https://blog.forumforthefuture.be/fr/article/maroc-la-facturation-electronique-obligatoire-des-2026-ce-que-les-entreprises-doivent-savoir/26288)
- [Clearance model and formats](https://nexora-expertise.ma/articles/facturation-electronique-maroc-clearance-dgi-formats-ubl-cii-factur-x)

**VAT**
- [Upsilon — when VAT is due (art. 95)](https://upsilon-consulting.com/fait-generateur-exigibilite-tva-maroc/)
- [Upsilon — practical VAT guide 2026](https://upsilon-consulting.com/guide-pratique-tva-maroc-2026/)
- [Upsilon — VAT on service exports](https://upsilon-consulting.com/tva-export-services-maroc/)

**Payroll**
- [Upsilon — CNSS rates 2026](https://upsilon-consulting.com/cotisations-cnss-maroc-2026/)
- [Upsilon — CNSS declaration](https://upsilon-consulting.com/declaration-cnss-maroc/)
- [Humantal — CNSS 2026](https://humantal.ma/ressources/taux-cnss-2026)
- [Wafir — payslip 2026](https://wafir.ma/fr/blog/fiche-paie-maroc-comprendre-2026)

**Data protection**
- [Upsilon — CNDP and law 09-08](https://upsilon-consulting.com/cndp-loi-09-08-protection-donnees-personnelles-maroc/)
- [Upsilon — foreign companies and 09-08](https://upsilon-consulting.com/loi-09-08-entreprises-etrangeres-maroc/)
- [CNDP — notification procedure](https://www.cndp.ma/wp-content/uploads/2025/07/CNDP_Procedure-de-Notification-des-traitements_20250724.pdf)

**E-signature**
- [Zoho Sign — legality in Morocco](https://www.zoho.com/sign/electronic-signatures/legality/morocco.html)
- [Trade Finance Global — digitalisation in Morocco](https://www.tradefinanceglobal.com/posts/legal-perspectives-digitalisation-trade-in-morocco/)
- [Mondaq — e-signature probative force](https://mondaq.com/new-technology/1073330/electronic-signature-creation-and-probative-force)

**Payments**
- [FNH — CMI e-payment](https://fnh.ma/article/actualites-marocaines/e-paiement-cmi-10-millions-d-operations-pour-plus-de-4-mds-de-dh-a-fin-septembre)
- [Wafir — CMI](https://wafir.ma/fr/institutions/cmi)

**PSA market**
- [BigTime — PSA buyer's guide 2026](https://www.bigtime.net/blogs/psa-buyers-guide)
- [Teamwork — best PSA for consultancies](https://www.teamwork.com/blog/best-psa-software-for-consultancies/)
- [Teamwork — best PSA for agencies](https://www.teamwork.com/blog/best-psa-software-for-agencies/)
- [The Digital Project Manager — Scoro vs Kantata](https://thedigitalprojectmanager.com/tools/scoro-vs-kantata/)
- [Productive — forecasting](https://productive.io/blog/forecasting-software/)
- [ERP Research — Productive](https://erpresearch.com/erp-add-ons/professional-services/productive)
- [Birdview — PSA with AI](https://birdviewpsa.com/blog/best-psa-software-with-ai/)
- [Deploymonkey — AI agents for services ERP](https://deploymonkey.com/blog/ai-agent-for-professional-services-erp)
