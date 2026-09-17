# Nexora SaaS — Enterprise Cloud Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![IBM Carbon](https://img.shields.io/badge/Design_System-IBM_Carbon-0f62fe?style=flat)](https://carbondesignsystem.com/)
[![Vitest](https://img.shields.io/badge/Tests-58%20Passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade B2B SaaS starter application engineered with **Next.js 16 (Turbopack), React 19, TypeScript, IBM Carbon Design System, shadcn/ui, and Tailwind CSS v4**. 

Nexora SaaS combines data density, executive analytics, and modern aesthetics into a unified cloud workspace. It provides a production-ready architecture with authentication, user and staff governance, role-based access control (RBAC), billing and subscription lifecycles, file management, internationalization across 9 languages, and a resilient Dual-Mode API layer with transparent demo fallback.

---

## SaaS Business Use Cases & Solutions

Nexora SaaS is architected to accelerate time-to-market for modern B2B SaaS business models:

| Use Case | Target Audience | Key Capabilities Provided |
| :--- | :--- | :--- |
| **1. Multi-Tenant Enterprise Cloud Platform** | B2B SaaS startups, Enterprise software providers | Multi-tenant workspace scoping, organization team invites with RBAC (Admin, Editor, Viewer), custom billing tiers, and tenant isolation. |
| **2. Developer API & Infrastructure Platform** | API-first SaaS, Developer tools | Scoped API key management, SHA-256 secret generation, automated HMAC webhooks, live event delivery logs, and API throughput telemetry. |
| **3. AI Infrastructure & Token Metering** | Generative AI platforms, LLM wrappers, ML services | Real-time AI token metering, GPU/compute overage billing calculations, Ask Victor (Nexora AI) conversational telemetry assistant, and quota threshold limits. |
| **4. Subscription & Financial Revenue Engine** | Recurring revenue SaaS, Usage-based billing | Tiered catalog (Starter, Pro, Enterprise), automated PDF invoice generation, Stripe portal checkout integration, Net Revenue Retention (NRR) and MRR/ARR ledgers. |
| **5. Enterprise Security & SOC 2 Compliance** | Regulated industries, FinTech, HealthTech | Immutable SOC 2 audit logging, 2FA authenticator verification, session lock-screen workstation defense, and GDPR data portability / erasure. |

---

## Key Highlights & Features

- **Executive Cloud Analytics Hub**:
  - **4 Core SaaS KPI Cards**: Monthly Recurring Revenue (MRR), Net Revenue Retention (NRR), Active Multi-tenant Workspaces, and Customer Churn Rate with high-density vertical bar sparklines.
  - **Dual Comparative 28-Day MRR Growth Chart**: Visualizes daily recurring revenue run-rate ($168.9k MRR / $2.02M ARR) compared with prior cycles.
  - **SaaS Subscription Breakdown**: Real-time revenue ledger tracking Enterprise subscriptions, Pro teams, AI compute token overages, dedicated pods, and churn.
  - **Top Tiers & Cloud Add-ons**: Visual progress tracking of revenue contribution across annual commitments, seats, and compute resources.
  - **Operational Telemetry & ARPU**: 24-hour API request throughput (`2.4M req/hr`) and trailing 7-month ARPU expansion curves (`$1,180/mo`).
  - **Operational Explanations**: Every analytics card includes an executive operational summary explaining metric calculation and recommended business actions.
  - **Ask Victor (Nexora AI)**: Floating conversational AI assistant providing instant answers to revenue queries, compute overages, and churn forecasts.
- **Modern Minimalist Authentication Suite**:
  - Redesigned single-column centered card aesthetic with grounded vintage architectural city skyline engraving.
  - Unified design across **Login by Email**, **Register**, **Forgot Password**, **OTP Code Verification**, and **Set New Password**.
  - One-click demo account bypass and auto-fill helpers.
- **User & Staff Governance**:
  - Full Users management with 4-metric summary KPI grids.
  - Staff directory with active-duty indicators and role configurations.
  - Banned Users monitoring with sanction filters and compliance metrics.
  - Real portrait photo headshots generated via AI and assigned across all profiles and the navigation sidebar.
- **Billing & Subscription Engine**: Plans tier catalog, dynamic subscriptions table, transaction records, usage metering gauges, and invoice generation with automated PDF preview and download.
- **Developer & API Platform**: Scoped API key management with token creation modal, webhook endpoint registration with event filtering, and SOC 2 compliant audit logging.
- **Dual-Mode Resilient API Layer**: Seamlessly connects to live microservice REST backends via a Next.js server proxy while offering automatic in-memory demo data fallback with live filtering, searching, and pagination.
- **Internationalization (i18n)**: Native multi-lingual routing powered by `next-intl` supporting 9 languages (English, Arabic, German, Spanish, French, Hindi, Russian, Urdu, Chinese).
- **Security & RBAC**: JWT token management, 2FA setup, lock screen security, session termination, and permission-based UI gatekeeping.
- **Automated Testing Suite**: 58 comprehensive unit and integration tests powered by Vitest and React Testing Library across 12 test suites.

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16.1.6](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Core UI** | [React 19.2.4](https://react.dev/), [TypeScript 5.9.3](https://www.typescriptlang.org/) |
| **Design System** | [IBM Carbon Design System](https://carbondesignsystem.com/) (`@carbon/react`, `@carbon/icons-react`) |
| **Component Primitives** | [shadcn/ui](https://ui.shadcn.com/) built on [Radix UI](https://www.radix-ui.com/) |
| **Styling & Motion** | [Tailwind CSS v4](https://tailwindcss.com/), [tw-animate-css](https://github.com/), [Framer Motion](https://www.framer.com/motion) |
| **Data Tables** | [TanStack React Table v8](https://tanstack.com/table/v8), [TanStack Virtual](https://tanstack.com/virtual) |
| **Data Fetching & Cache** | [TanStack React Query v5](https://tanstack.com/query), [Axios](https://axios-http.com/) |
| **Charts & Visuals** | [Recharts](https://recharts.org/) |
| **Internationalization** | [next-intl v4](https://next-intl-docs.vercel.app/) |
| **Form & Validation** | [React Hook Form](https://react-hook-form.com/), [Zod v4](https://zod.dev/) |
| **Testing** | [Vitest](https://vitest.dev/), [@testing-library/react](https://testing-library.com/), [JSDOM](https://github.com/jsdom/jsdom) |

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18.18.0 or higher (v20+ recommended)
- **npm** (or pnpm / yarn)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd nextjs-fullstack-saas-starter
npm install
```

### 3. Environment Configuration
Copy the environment variables template:
```bash
cp .env.example .env.local
```
*(See [Environment Variables](#environment-variables) for configuration parameters)*

### 4. Start Development Server
Run the local dev server with Turbopack:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The app defaults to the English locale at `/en/dashboard/overview`.

### 5. Running Automated Tests
Run the Vitest test suite:
```bash
npm test
```
To run tests in interactive watch mode:
```bash
npm run test:watch
```

---

## Demo Accounts & Access

The platform operates with out-of-the-box demo accounts and realistic in-memory data:

| Account Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Executive Admin** | `alex.morgan@company.io` | `admin123` | Full Administrative & Superuser Access |
| **Staff Member** | `sophia.v@nexora.io` | `staff123` | Operational & Platform Management |
| **Standard User** | `sarah.chen@techcorp.com` | `user123` | Client Workspace & Project Access |

---

## Project Structure

```text
nextjs-fullstack-saas-starter/
├── docs/                                  # In-depth architectural & audit documentation
│   ├── WORKFLOW_ENTRY_TO_CLIENT.md        # Request lifecycle from entry to client rendering
│   ├── CODE_REVIEW_AND_AUDIT.md           # Security, performance, and code quality audit
│   ├── FRONTEND_AND_API_ARCHITECTURE.md   # Design system tokens and API resiliency pattern
│   ├── PROJECT_CODEBASE_COMMENTARY.md     # Directory-by-directory annotated commentary
│   └── USER_AND_DEVELOPER_GUIDE.md        # Administrator and developer manuals
├── public/                                # Static assets, logo emblems, AI avatars
│   ├── avatars/                           # AI-generated high-res corporate portrait photos
│   └── app-logo.png                       # Nexora SaaS geometric logo mark
├── src/
│   ├── app/                               # Next.js App Router root
│   │   ├── [locale]/                      # Localized application routes (en, fr, de, etc.)
│   │   │   ├── auth/                      # Authentication (login, register, forgot-password)
│   │   │   ├── dashboard/                 # Protected SaaS dashboard views
│   │   │   │   ├── overview/              # Analytics & charts dashboard
│   │   │   │   ├── users/                 # Users hub with KPI cards & data table
│   │   │   │   ├── staffs/                # Staff directory with duty statuses
│   │   │   │   ├── banned-users/          # Sanctioned accounts & security filters
│   │   │   │   ├── billing/               # Plans, subscriptions, and invoices
│   │   │   │   ├── projects/              # Projects workspace
│   │   │   │   └── settings/              # Profile, security, and preferences
│   │   │   ├── globals.css                # IBM Carbon design tokens & Tailwind imports
│   │   │   └── layout.tsx                 # Master localized layout with Providers
│   │   └── api/                           # Next.js API catch-all proxy routes
│   ├── components/
│   │   ├── shared/                        # Feature-chunk components (domain organized)
│   │   │   ├── data-table-chunks/         # Reusable TanStack Table toolbar, headers, rows
│   │   │   ├── overview-chunks/           # Analytics metric cards & Recharts graphs
│   │   │   ├── users-chunks/              # Users table columns, cards, action modals
│   │   │   ├── staffs-chunks/             # Staff table columns & KPI summary cards
│   │   │   ├── banned-users-chunks/       # Banned users columns & summary cards
│   │   │   ├── invoices-chunks/           # Invoice forms, previews, and PDF generators
│   │   │   └── sidebar-chunks/            # Navigation sidebar, user menu, brand header
│   │   └── ui/                            # shadcn/ui & Carbon design system primitives
│   ├── contexts/                          # React context providers (AuthProvider, ThemeProvider)
│   ├── hooks/                             # Custom React hooks (profile, mobile, security)
│   ├── i18n/                              # Internationalization request config
│   ├── lib/
│   │   ├── api/                           # Typed API client modules for each domain
│   │   ├── demo-data/                     # Resilient in-memory dataset, pagination, seeders
│   │   ├── myapi/                         # Axios client with interceptors & auth injection
│   │   └── utils/                         # Utility helpers, formatting, toasts
│   ├── messages/                          # 9 translation dictionaries (en.json, fr.json, etc.)
│   ├── proxy.ts                           # Reverse proxy ingress configuration
│   └── types/                             # Strict TypeScript contracts & domain models
├── vitest.config.ts                       # Test runner configuration
└── package.json                           # Dependencies and scripts
```

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **`npm run dev`** | `next dev --turbopack` | Starts development server with Turbopack on port 3000 |
| **`npm run build`** | `next build` | Creates an optimized production build |
| **`npm run start`** | `next start` | Starts the production server |
| **`npm test`** | `vitest run` | Executes all 30 automated Vitest tests once |
| **`npm run test:watch`** | `vitest` | Runs tests in interactive watch mode |
| **`npm run typecheck`** | `tsc --noEmit` | Validates strict TypeScript compilation |
| **`npm run lint`** | `eslint` | Runs ESLint syntax and code quality checks |
| **`npm run format`** | `prettier --write` | Formats all source files according to Prettier rules |

---

## Environment Variables

Configure these settings in your `.env.local`:

```ini
# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Nexora SaaS"

# Backend Microservice Endpoint (Leave empty to use automatic Demo Data fallback)
NEXT_PUBLIC_API_URL=http://localhost:40001
API_BACKEND_URL=http://localhost:40001

# Authentication Secrets
JWT_SECRET=your-secure-jwt-secret-key-min-32-chars

# Default Locale
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

## Detailed Documentation Guides

For comprehensive technical, operational, and architectural documentation, refer to the dedicated markdown files:

1. **[Workflow from Entry Point to Client Side](file:///Users/mac/Documents/nextjs-fullstack-saas-starter/docs/WORKFLOW_ENTRY_TO_CLIENT.md)**  
   *Traces the complete lifecycle of a request from network ingress, Next.js routing, and SSR layout resolution down to client-side hydration, React Query caches, and UI rendering.*

2. **[Code Review and Security & Architecture Audit](file:///Users/mac/Documents/nextjs-fullstack-saas-starter/docs/CODE_REVIEW_AND_AUDIT.md)**  
   *Deep-dive evaluation of codebase quality, TypeScript strictness, authentication security (JWT/cookies/XSS/CSRF), performance, accessibility, and prioritized remediation roadmap.*

3. **[Frontend and API Architecture](file:///Users/mac/Documents/nextjs-fullstack-saas-starter/docs/FRONTEND_AND_API_ARCHITECTURE.md)**  
   *Technical analysis of the IBM Carbon Design System, Tailwind v4 tokens, feature-chunk component pattern, TanStack data tables, and the Dual-Mode Resilient API layer.*

4. **[Project Codebase Commentary](file:///Users/mac/Documents/nextjs-fullstack-saas-starter/docs/PROJECT_CODEBASE_COMMENTARY.md)**  
   *A complete file-by-file and directory-by-directory annotated architectural commentary of every module across the repository.*

5. **[User & Developer Guide](file:///Users/mac/Documents/nextjs-fullstack-saas-starter/docs/USER_AND_DEVELOPER_GUIDE.md)**  
   *Operational manual for platform administrators and an onboarding guide for developers wishing to extend or integrate new features.*

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

© 2026 Nexora SaaS Enterprise Cloud. All rights reserved.
