# Nexora SaaS: User & Developer Guide

This guide is divided into two comprehensive sections:
- **Part I: Administrator & End-User Manual** — Operating the platform, managing users, reviewing analytics, and handling billing.
- **Part II: Developer & Contributor Handbook** — Onboarding, local setup, test execution, creating features, and connecting live APIs.

---

# Part I: Administrator & End-User Manual

## 1. Accessing the Platform & Authentication

Nexora SaaS features a minimalist single-column authentication experience anchored by an architectural vintage city skyline engraving. Navigate to [http://localhost:3000/en/auth](http://localhost:3000/en/auth) and sign in or test with any of the demo accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Executive Admin** | `alex.morgan@company.io` | `admin123` | Unrestricted superuser access to all views |
| **Staff Member** | `sophia.v@nexora.io` | `staff123` | Operational access to users, billing, and logs |
| **Standard User** | `sarah.chen@techcorp.com` | `user123` | Personal workspace, projects, and invoices |

### Authentication Flows
- **Login by Email**: Fast credentials login with demo account auto-fill.
- **Register**: Onboard new workspace accounts with username, work email, and password.
- **Forgot Password Recovery**: Self-service recovery flow requiring work email, 6-digit OTP code verification, and secure password reset.
- **Two-Step Verification**: Enable 2FA in **Settings > Security** to secure your credentials with an authenticator app.
- **Lock Screen**: To secure your workstation while away, click the lock icon or select **Lock Session** in the bottom-left user menu. Your open forms and draft inputs remain intact until you enter your password.

---

## 2. Navigating the Executive Cloud Analytics Hub

The **Cloud Analytics Hub** (`/en/dashboard/overview`) delivers real-time SaaS business telemetry, recurring revenue models, and multi-tenant infrastructure metrics. Every card and visualization includes an explanatory operational paragraph directly underneath:

1. **Core SaaS KPI Cards (with Bar Sparklines)**:
   - **Monthly Recurring Revenue (MRR)**: `$168,920` (+24.8% vs prior cycle). Pacing toward the $200k Q4 goal.
   - **Net Revenue Retention (NRR)**: `118.4%` (+4.2% expansion). Measures retained recurring revenue including compute overages.
   - **Active Workspaces**: `1,428` (+18.5% growth). Active multi-tenant tenant clusters provisioned across cloud regions.
   - **Customer Churn Rate**: `1.2%` (-0.6% improvement). Monthly logo contraction rate following dedicated SLA rollouts.
2. **Dual Comparative 28-Day MRR Growth Chart**:
   - Visualizes daily recurring revenue run-rate ($168.9k MRR / $2.02M ARR) compared against the prior 30-day billing cycle. Includes an executive operational explanation paragraph summarizing expansion drivers.
3. **SaaS Revenue Breakdown Card**:
   - Granular breakdown of subscription streams: Enterprise commitments, Pro team seats, AI compute overages, dedicated pods, and churn offsets with directional SVG wave sparklines and ledger analysis.
4. **Top Tiers & Cloud Add-ons**:
   - Ranked progress bars tracking revenue and quota completion across Enterprise Annual commitments, Pro Team workspaces, Nexora AI tokens, and dedicated SOC 2 pods.
5. **API Request Throughput & Gateway Telemetry**:
   - 24-hour request velocity (`2.4M req/hr`) with 99.99% uptime indicator, 42ms median latency, and edge gateway operational telemetry notes.
6. **Average Revenue Per Account (ARPU)**:
   - Trailing 7-month expansion curve (`$1,180/mo`, +$142 expansion) detailing account-level unit economics.
7. **Ask Victor (Nexora AI) Telemetry Assistant**:
   - Floating interactive assistant pill at the bottom of the screen with pre-filled SaaS prompt chips for instant executive summaries on revenue drivers, compute overages, and churn forecasting.

---

## 3. Managing Users, Staff & Sanctioned Accounts

### 3.1 Users Hub (`/en/dashboard/users`)
- **Summary Cards**: Inspect real-time metrics for Total Users, Active Users, Pending/Inactive, and Banned Accounts.
- **Search**: Use the search input on the right side of the toolbar to locate users by full name, email, or username.
- **Filtering**: Click the filter icon next to the search bar to filter users by account status.
- **Actions**: Click the three dots `...` on any user row to view details, edit roles, toggle active status, or suspend/ban the account.

### 3.2 Staff Directory (`/en/dashboard/staffs`)
- **Summary Cards**: View Total Staff, Active on Duty, Roles Configured, and Inactive/Pending onboarding.
- **Duty Badges**: Easily distinguish between active team members and those currently off-duty.

### 3.3 Banned Users Hub (`/en/dashboard/banned-users`)
- **Summary Cards**: Track Total Banned, Client Account Sanctions, Staff Suspensions, and Active Sanctions.
- **User Type Filter**: Isolate whether sanctions apply to standard Users, Staff, or Admin accounts.
- **Unban Workflow**: Click `...` and select **Activate / Restore Access** to lift sanctions immediately.

---

## 4. Billing, Subscriptions & Invoices

- **Plans Catalog (`/en/dashboard/billing/plans`)**: Configure pricing tiers (Starter, Growth, Enterprise) and feature allotments.
- **Subscriptions (`/en/dashboard/billing/subscriptions`)**: Monitor active, trailing, and canceled subscriptions with automatic renewal tracking.
- **Invoices (`/en/dashboard/invoices`)**:
  - Click **+ New Invoice** to generate a branded invoice for a client.
  - Click any invoice row to view the real-time Carbon invoice preview with automated PDF download and print capabilities.

---

## 5. Language & Theme Customization

- **Language Switcher**: Located in the top header bar. Instantly switch between 9 languages (English, Arabic, German, Spanish, French, Hindi, Russian, Urdu, Chinese). Arabic and Urdu automatically flip layout orientation to Right-to-Left (RTL).
- **Theme Toggler**: Click the moon/sun icon in the top header to toggle between **IBM Carbon Light** (default) and **IBM Carbon Dark** mode.

---

# Part II: Developer & Contributor Handbook

## 1. System Requirements & Setup

### Prerequisites
- **Node.js**: v18.18.0 or higher (v20+ recommended).
- **Package Manager**: `npm` (v9+) or `pnpm`.

### Installation Steps
```bash
# 1. Clone the repository
git clone <repository-url>
cd nextjs-fullstack-saas-starter

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Start development server with Turbopack
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 2. Environment Variables Reference

Edit `.env.local` according to your deployment target:

```ini
# Base Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Nexora SaaS"

# Backend Microservice Endpoint
NEXT_PUBLIC_API_URL=http://localhost:40001
API_BACKEND_URL=http://localhost:40001

# Default Localization
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Authentication Token Signing Secret (Minimum 32 characters)
JWT_SECRET=super-secret-enterprise-jwt-token-key-32-chars

# Demo Mode — local development only (defaults to false when unset)
# SECURITY: Must be set to "false" or unset in production environments!
NEXT_PUBLIC_DEMO_MODE=true
```

> [!WARNING]
> **Production Demo Mode Guard**:
> - `NEXT_PUBLIC_DEMO_MODE` is strictly restricted to local development and preview demonstrations.
> - In production (`VERCEL_ENV=production`), `next.config.mjs` and `scripts/prebuild.js` enforce a build-time guard that halts compilation if `NEXT_PUBLIC_DEMO_MODE=true` is detected.
> - The Edge proxy guard (`src/proxy.ts`) strictly enforces session cookie authentication on `/dashboard/*` routes regardless of demo mode.
> - Runtime fallbacks issue a `console.warn` alert whenever `DEMO_ADMIN_USER` is utilized during local development.

---

## 3. Running Automated Tests & Quality Gates

Nexora SaaS uses **Vitest** and **React Testing Library** for fast, reliable unit and integration testing:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Validate strict TypeScript compilation
npm run typecheck

# Execute ESLint checks
npm run lint

# Format codebase with Prettier
npm run format
```

All 30 unit tests must pass before opening a Pull Request or creating a production release.

---

## 4. How to Add a New Dashboard Feature (Chunk Pattern)

When creating a new dashboard domain (for example, `Audit Logs`):

### Step 1: Create Domain Type Contracts
Create `src/types/audit-logs.ts`:
```typescript
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  ipAddress: string;
  createdAt: string;
}
```

### Step 2: Implement the API Client Layer
Create `src/lib/api/audit-logs-api.ts`:
```typescript
import apiClient from "@/lib/myapi/client";
import { AuditLog } from "@/types/audit-logs";
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables";

export const fetchAuditLogsApi = async (
  params: Partial<ServerTableParams> = {}
): Promise<ApiPaginatedResponse<AuditLog>> => {
  const { data } = await apiClient.get("/audit-logs", { params });
  return data;
};
```

### Step 3: Build the Feature-Chunks
Create `src/components/shared/audit-logs-chunks/`:
1. `audit-logs-columns.tsx`: Define TanStack columns with sortable headers and status badges.
2. `audit-logs-summary-cards.tsx`: 4-column metric grid displaying total events, security alerts, and operator logins.
3. `audit-logs-page.tsx`: Orchestrate data queries using `useQuery` and render the `DataTable` component.

### Step 4: Add the Next.js Route View
Create `src/app/[locale]/dashboard/audit-logs/page.tsx`:
```tsx
import { AuditLogsPage } from "@/components/shared/audit-logs-chunks/audit-logs-page";

export default function Page() {
  return <AuditLogsPage />;
}
```

### Step 5: Add Sidebar Navigation Link
In `src/components/shared/sidebar-chunks/dashboard-sidebar.tsx`, add the route under the appropriate navigation group.

---

## 5. Connecting a Real Production Backend

To replace the in-memory demo engine with a live microservice:
1. Deploy your backend service (Node.js, Go, Python, Java) exposing RESTful JSON endpoints (e.g. `/users`, `/invoices`, `/auth/login`).
2. Update `.env.local` (or production environment variables):
   ```ini
   API_BACKEND_URL=https://api.yourdomain.com
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   NEXT_PUBLIC_DEMO_MODE=false
   ```
3. The Next.js server catch-all proxy in `src/app/api/[...catchall]/route.ts` will automatically forward requests to your production service with zero changes required to UI components. Setting `NEXT_PUBLIC_DEMO_MODE=false` ensures authentic credential checks and real API responses are enforced.

---

## 6. Adding a New Language in `next-intl`

1. Create the new JSON message catalog: `src/messages/<locale>.json` (e.g. `src/messages/it.json` for Italian).
2. Register the locale in `src/i18n/request.ts` within the `locales` array:
   ```typescript
   export const locales = ["en", "ar", "de", "es", "fr", "hi", "ru", "ur", "zh", "it"];
   ```
3. Add the language option to `src/components/shared/header-chunks/language-switcher.tsx`.

---

## 7. Enterprise Security & Architecture Features

### 7.1 Centralized RBAC (`can()`)
Use `can()` and `getUserPermissions()` from `@/lib/permissions/can` for permission enforcement:
```tsx
import { can } from "@/lib/permissions/can";
import { AdminPermissionsPlatform } from "@/types/roles";

if (can(user, AdminPermissionsPlatform.USERS_DELETE)) {
  // perform delete
}
```
Or declaratively gate UI elements using `<PermissionGuard>`:
```tsx
import { PermissionGuard } from "@/components/guard/permission-guard";
import { AdminPermissionsPlatform } from "@/types/roles";

<PermissionGuard permission={AdminPermissionsPlatform.USERS_DELETE} fallback={<AccessDenied />}>
  <DeleteButton />
</PermissionGuard>
```

### 7.2 Subscription Tier Guard (`<PlanGuard>`)
Gate advanced features behind minimum subscription tiers (`free` < `pro` < `enterprise`):
```tsx
import { PlanGuard } from "@/components/guard/plan-guard";

<PlanGuard requiredPlan="pro" fallback={<UpgradePrompt />}>
  <AdvancedAnalyticsDashboard />
</PlanGuard>
```

### 7.3 Feature Flags (`useFeatureFlag`)
Evaluate features against subscription plans or superuser permissions:
```tsx
import { useFeatureFlag } from "@/hooks/plans/use-feature-flag";

const { enabled, requiredPlan } = useFeatureFlag("advancedAnalytics");
```

### 7.4 Resource Quota Metering (`useUsage`)
Track consumption against subscription limits with real-time percentage and threshold alerts:
```tsx
import { useUsage } from "@/hooks/plans/use-usage";

const { usage, isNearLimit, isOverLimit } = useUsage();
if (isNearLimit("apiCalls", 80)) {
  // Show 80% quota warning badge
}
```

### 7.5 GDPR Compliance APIs
Full compliance with EU General Data Protection Regulation:
- `requestDataExportApi(format)`: Article 20 data portability export.
- `requestAccountDeletionApi({ reason })`: Article 17 right-to-erasure with a 14-day grace period.
- `cancelAccountDeletionApi()`: Undo pending account deletion within grace period.

### 7.6 Crash-Resilient Error Boundary
The app wraps both the root application tree and dashboard pages inside `<ErrorBoundary>` to catch runtime errors, provide stack trace debugging, and offer self-healing "Try Again" / "Go to Dashboard" recovery actions.

