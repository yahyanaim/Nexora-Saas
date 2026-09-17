# Nexora SaaS: Comprehensive Codebase Commentary & Module Catalog

This document provides a deep, file-by-file and directory-by-directory annotated architectural commentary of the entire **Nexora SaaS** codebase. It acts as an engineering map for developers seeking to understand the role, lifecycle, and design decisions behind every module.

---

## 1. Top-Level Directory Topology

```text
nextjs-fullstack-saas-starter/
├── docs/             # Technical architecture, workflows, audits, and guides
├── public/           # Static media assets, brand logos, AI portrait photos
├── src/              # Application source code
│   ├── app/          # Next.js 16 App Router (routes, layouts, API proxy)
│   ├── components/   # UI component library & domain feature-chunks
│   ├── contexts/     # Global React state providers (Theme, Auth)
│   ├── hooks/        # Custom React hooks (profile, mobile, security)
│   ├── i18n/         # Internationalization request routing logic
│   ├── lib/          # API clients, demo data store, utilities, Axios instance
│   ├── messages/     # i18n JSON message catalogs (9 languages)
│   ├── proxy.ts      # Reverse proxy network configuration
│   └── types/        # TypeScript type contracts and domain schemas
├── vitest.config.ts  # Automated test configuration
├── tsconfig.json     # Strict TypeScript compiler options
└── package.json      # Dependencies and execution scripts
```

---

## 2. Directory Deep-Dive & File Annotations

### `src/app/` — Next.js App Router Architecture

The `app/` directory governs routing, layouts, and server-side entry points.

- **`src/app/layout.tsx`**:
  - The root HTML shell.
  - Injects global Google fonts (IBM Plex Sans, Inter).
  - Configures default meta viewport, character sets, and OpenGraph headers.
- **`src/app/[locale]/layout.tsx`**:
  - The localized master layout.
  - Asynchronously loads translation messages via `getRequestConfig`.
  - Wraps the entire application in `NextIntlClientProvider`, `ThemeProvider`, `AuthProvider`, and `QueryClientProvider`.
  - Dynamically sets `dir="rtl"` for Arabic (`ar`) and Urdu (`ur`).
- **`src/app/[locale]/globals.css`**:
  - Central styling foundation.
  - Implements official IBM Carbon Design v11 CSS tokens in `:root` (Light mode) and `.dark` (Carbon Gray 100 mode).
  - Sets up CSS variables for background, foreground, primary (`#0f62fe`), borders (`#e0e0e0`), muted, and accent colors.
- **`src/app/[locale]/dashboard/layout.tsx`**:
  - The enterprise dashboard shell.
  - Renders `DashboardSidebar` (left navigation), `DashboardHeader` (top bar with breadcrumbs, language switcher, theme toggle), and the main scrollable content area.
- **`src/app/[locale]/dashboard/overview/page.tsx`**:
  - The executive Analytics view.
  - Hosts 4 KPI metric cards and 7 distinct Recharts visualizations (Area, Bar, Line, Pie, Radar, Radial, Tooltip) with explanatory operational paragraphs.
- **`src/app/[locale]/dashboard/users/page.tsx`**:
  - Platform users management view.
  - Embeds `UsersSummaryCards` (4-card metric grid) and the interactive TanStack Users data table.
- **`src/app/[locale]/dashboard/staffs/page.tsx`**:
  - Internal staff management view.
  - Embeds `StaffsSummaryCards` and the Staff data table with active-duty status indicators.
- **`src/app/[locale]/dashboard/banned-users/page.tsx`**:
  - Security and compliance view.
  - Embeds `BannedUsersSummaryCards`, userType filters, and the Banned Users data table.
- **`src/app/[locale]/dashboard/billing/`**:
  - Contains sub-views for Plans catalog, Active Subscriptions, Invoices, and Transactions.
- **`src/app/api/[...catchall]/route.ts`**:
  - Next.js server route acting as a secure reverse proxy to backend microservices.
  - Hides internal endpoints and handles CORS and header forwarding.

---

### `src/components/` — UI Primitives & Feature-Chunks

The component architecture is strictly split into two layers:

#### 1. `src/components/ui/` (Design System Primitives)
Built on **shadcn/ui** and **IBM Carbon**:
- **`carbon/icons.tsx`**: Unified barrel export mapping `@carbon/icons-react` icons (e.g. `UserIcon`, `Trash2`, `Ban`, `CheckCircle2`) to familiar component names.
- **`space-avatar.tsx`**: Smart avatar primitive that accepts `src` (for real photos), `name` (for initial fallback), and `profileColor`.
- **`status-badge.tsx`**: Status indicator with dot glyphs and curated color classes (emerald for active, amber for pending, destructive for banned).
- **`stat-card.tsx`**: Standardized enterprise KPI card with uppercase category title, monospace metric value, trend percentage chip, and contextual footer.
- **`table.tsx`**: Accessible HTML table primitives styled with Carbon Gray 10 borders and zebra hover states.
- **`button.tsx`, `dialog.tsx`, `popover.tsx`, `select.tsx`, `dropdown-menu.tsx`**: Headless Radix UI components styled with Carbon v11 tokens.

#### 2. `src/components/shared/` (Domain Feature-Chunks)
Organized into domain-specific chunks to eliminate monolithic files:
- **`data-table-chunks/`**:
  - `data-table.tsx`: Generic wrapper combining TanStack Table state, pagination, and virtual rows.
  - `data-table-toolbar.tsx`: Responsive toolbar with search input docked on the right side next to filters and actions.
  - `data-table-column-header.tsx`: Sortable table header buttons with ascending/descending indicators.
  - `data-table-pagination.tsx`: Pagination controls with page size selector (10, 20, 50) and page jump buttons.
- **`overview-chunks/`**:
  - `cards/section-cards.tsx`: 4 high-level KPI cards for the Analytics overview.
  - `charts/area-chart.tsx`: Two-layer gradient area chart for desktop vs. mobile traffic.
  - `charts/bar-chart.tsx`: Interactive bar chart with device view toggles.
  - `charts/line-chart.tsx`: Monotone spline engagement curves.
  - `charts/pie-chart.tsx`: Circular cohort breakdown.
  - `charts/radar-chart.tsx` & `charts/radial-chart.tsx`: Multi-axis balance and browser penetration charts.
  - `charts/tooltip-chart.tsx`: Multi-segment daily task distribution chart.
- **`users-chunks/`**:
  - `users-page.tsx`: Orchestrator component connecting queries, state, and modals.
  - `users-summary-cards.tsx`: 4-column summary metric grid for user accounts.
  - `users-columns.tsx`: TanStack table column definitions featuring `SpaceAvatar`, email links, user type badges, and row action popovers.
- **`staffs-chunks/`**:
  - `staffs-page.tsx`: Staff directory orchestrator.
  - `staffs-summary-cards.tsx`: Staff KPI summary grid (Total Staff, Active on Duty, Roles Configured, Inactive).
  - `staffs-columns.tsx`: Staff table columns with duty statuses and role labels.
- **`banned-users-chunks/`**:
  - `banned-users-page.tsx`: Banned accounts orchestrator with userType filter.
  - `banned-users-summary-cards.tsx`: Sanctions summary grid (Total Banned, Client Accounts, Staff Suspensions, Active Sanctions).
  - `banned-users-columns.tsx`: Columns highlighting ban reasons, suspension dates, and unban triggers.
- **`sidebar-chunks/`**:
  - `dashboard-sidebar.tsx`: Collapsible navigation sidebar with Nexora logo emblem, workspace switcher dropdown, and grouped navigation links.
  - `workspace-switcher.tsx`: Multi-tenant organization selector with active plan badges and instant workspace switching.
  - `nav-user.tsx`: Bottom profile card rendering the user's real AI portrait photo, name, email, and sign-out actions.
- **`command-palette/`**:
  - `command-palette.tsx`: Global keyboard search modal (`Cmd+K` / `Ctrl+K`) for routes, live users with AI portraits, invoices, and quick theme/lock actions.
- **`notifications/`**:
  - `notification-center.tsx`: Top header Bell popover with real-time categorized event alerts, unread badges, and dismissal controls.
- **`audit-logs-chunks/`**:
  - `audit-logs-page.tsx`: SOC-2 compliance activity feed with real IP tracking, geolocation tags, and 1-click export.
  - `audit-logs-summary-cards.tsx`: 4-card KPI summary grid using `MetricCardGrid`.
  - `audit-logs-columns.tsx`: Column definitions featuring actor headshots, category chips, and relative timestamps.
- **`developer-chunks/`**:
  - `developer-page.tsx`: Tabbed developer hub managing API keys, webhooks, and SDK quickstart guides.
  - `api-keys-card.tsx` & `create-api-key-dialog.tsx`: Programmatic token generator with permission scopes and one-time secret reveals.
  - `webhooks-card.tsx` & `create-webhook-dialog.tsx`: Outgoing webhook endpoint manager with live ping latency testing.
  - `quick-docs-card.tsx`: Interactive multi-language integration snippets (cURL, TypeScript, Python).

---

### `src/contexts/` — Global State Management

- **`src/contexts/theme-provider.tsx`**:
  - Wraps `next-themes`.
  - Enforces `defaultTheme="light"` with immediate support for toggling to `.dark`.
  - Ensures no flash of unstyled content (FOUC) during hydration.
- **`src/contexts/auth-provider.tsx`**:
  - Central security and session coordinator.
  - Manages session lifecycle using backend HttpOnly cookies (`fetchMyAccountApi()`).
  - Dispatches `getMeApi()` on mount to validate credentials.
  - Exposes `login()`, `logout()`, `user`, `isAuthenticated`, and `isLoading`.
  - Provides instant demo credentials fallback if running in disconnected/offline mode.

---

### `src/lib/` — API Clients, Interceptors & Demo Engine

- **`src/lib/myapi/client.ts`**:
  - Central Axios instance configured with `baseURL: process.env.NEXT_PUBLIC_API_URL` and `withCredentials: true` for automatic HttpOnly cookie forwarding.
  - **Security Architecture**: Relies on browser-managed HttpOnly cookies instead of Authorization header injection to eliminate XSS token theft.
  - **Response Interceptor**: Dispatches `billing:upgrade-required` events on 403 and automatically queues 401 requests during token refresh.
- **`src/lib/api/` (Domain API Clients)**:
  - `auth-apis.ts`: Login, registration, password reset, and session validation endpoints.
  - `users-apis.ts`: Typed user querying, role assignment, and suspension APIs.
  - `billing-apis.ts`: Stripe checkout session creation, portal redirects, and plan upgrades.
  - `audit-logs-api.ts`: Dual-mode compliance event retriever with demo fallback.
  - `developer-apis.ts`: Scoped API key lifecycle and webhook dispatch testing service.
- **`src/lib/utils/`**:
  - `export-data.ts`: Universal RFC 4180 CSV serializer with UTF-8 BOM (`\uFEFF`) and formatted JSON file downloader.
  - `format-date.ts`: Moment.js locale-aware date and time formatting utilities.
  - `users-apis.ts`: User listing (`fetchUsersApi`), status toggle (`toggleStatusUserApi`), and account banning (`toggleBanUserApi`).
  - `billing-apis.ts`: Plans catalog, subscriptions, and payment checkout sessions.
  - `invoices-api.ts`: Invoice listing, PDF generation, and payment status updates.
  - `projects-api.ts`: Project workspace management.
  - `roles-apis.ts`: RBAC role and permission configurations.
- **`src/lib/demo-data/index.ts`**:
  - Resilient in-memory dataset providing enterprise-grade demo records.
  - Contains seeded users, staff, banned users, invoices, projects, and plans.
  - Maps real AI portrait headshots (`/avatars/*.jpg`) to each user entity.
  - Implements `paginateDemoList()`: in-memory search, status filtering, multi-column sorting, and pagination arithmetic matching production backend responses.

---

### `src/types/` — Strict TypeScript Contracts

- **`src/types/auth.ts`**: `AuthUser`, `AuthResponse`, `LoginCredentials`, `RegisterCredentials`.
- **`src/types/users.ts`**: `User`, `UserStatus` (`ACTIVE`, `INACTIVE`, `NOT_VERIFIED`, `BANNED`, `DELETED`), `UserType` (`USER`, `STAFF`, `ADMIN`), `UserRole`.
- **`src/types/plans.ts`**: `Plan`, `PlanFeature`, `BillingPeriod`.
- **`src/types/subscriptions.ts`**: `Subscription`, `SubscriptionStatus`.
- **`src/types/invoices.ts`**: `Invoice`, `InvoiceItem`, `InvoiceStatus`.
- **`src/types/tables.ts`**: `ServerTableParams`, `ApiPaginatedResponse`, `TablePaginationMeta`.

---

### `src/messages/` — Internationalization Dictionaries

9 JSON files matching supported locales:
- `en.json` (English - default)
- `ar.json` (Arabic - RTL)
- `de.json` (German)
- `es.json` (Spanish)
- `fr.json` (French)
- `hi.json` (Hindi)
- `ru.json` (Russian)
- `ur.json` (Urdu - RTL)
- `zh.json` (Chinese Simplified)
