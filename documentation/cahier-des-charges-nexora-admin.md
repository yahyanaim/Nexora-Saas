# Cahier des charges: Nexora Admin (platform console)

**Product:** Nexora ERP, the side used by the Nexora team
**Version:** 1.0 (draft), October 2026
**Owner:** Yahia Naim
**Status:** To validate before development

---

## 1. Context

Nexora has two products in one application:

1. **The ERP for companies.** Each customer company (for example Atlas Consulting) manages its employees, projects, time, invoices, expenses and so on. This part is already specified and built.
2. **The Nexora console, for the Nexora team.** Nexora is itself a company that sells a subscription. Its team must manage **all the customer companies**: who they are, which plan they pay for, whether they pay, how many people use the product, and what problems they have.

Today the console is a first version (Customers, Plans, Subscriptions, Invoices and so on), rebuilt on demo data. This document defines what it must become.

**Mission of the Nexora team:** onboard, run, bill, support and protect every company that uses Nexora, without ever seeing more of a company's private data than it needs.

---

## 2. Objectives

| # | Objective | How we measure it |
|---|---|---|
| O1 | See every customer company and its health in one place | One list with plan, status, users, MRR and last activity |
| O2 | Run the subscription business | MRR, ARR, churn, trials converted, overdue payments |
| O3 | Bill companies correctly in MAD, following Moroccan rules | Invoices with ICE, IF and 20% VAT, numbered without gaps |
| O4 | Help companies quickly | Support tickets answered within the agreed time; "view as" with consent |
| O5 | Keep the platform safe and compliant | Audit log of every Nexora staff action; law 09-08 (CNDP) respected |
| O6 | Control features and limits per plan | Seats, modules and storage limits applied automatically |

---

## 3. Actors (the Nexora team)

Every Nexora staff member signs in to the console with two-factor authentication. Each person has **one console role**.

| Role | Mission | Main rights |
|---|---|---|
| **Super admin** (founder or CTO) | Owns the platform | Everything, including managing Nexora staff and deleting a company |
| **Account manager / Sales** | Wins and grows customers | Create companies and trials, change plans, give discounts within a limit, see the pipeline |
| **Billing / Finance** | Gets paid | Nexora invoices, payments, refunds, credit notes, dunning, VAT reports |
| **Support agent** | Helps users | Tickets, company details, reset a user's access, "view as" (read-only, with consent) |
| **Technical / Ops** | Keeps it running | System health, incidents, jobs, data exports and restores, feature flags |
| **Compliance / DPO** | Protects data | Audit log, data requests (access, deletion), CNDP register, retention |
| **Read-only (investor or analyst)** | Looks at figures | Dashboards only, no personal data |

**Rule:** a Nexora staff member **never** edits a company's business data (invoices, salaries and so on). They can only look, with consent and a time limit, and every look is logged.

---

## 4. Functional scope

Each requirement has an ID (ADM-xx) and a priority: **P1** (must have for launch), **P2** (soon after) or **P3** (later).

### 4.1 Console dashboard

| ID | Requirement | Prio |
|---|---|---|
| ADM-01 | Cards: MRR, ARR, paying companies, trials, churn this month, overdue amount | P1 |
| ADM-02 | MRR chart by month, split into new, expansion, contraction and churn | P2 |
| ADM-03 | "Needs attention" list: payment failed, trial ending in 3 days, seat limit reached, no login for 14 days, open urgent ticket | P1 |
| ADM-04 | Signups and trial-to-paid conversion by month | P2 |

### 4.2 Companies (customers)

| ID | Requirement | Prio |
|---|---|---|
| ADM-10 | List of all companies: name, city, plan, status (trial, active, overdue, suspended, cancelled), users / seats, MRR, customer since, last activity, account manager | P1 |
| ADM-11 | Filters (plan, status, city, account manager) and search by name, ICE or email | P1 |
| ADM-12 | Company page with these tabs: Overview, Subscription, Invoices and payments, Users, Usage, Tickets, Notes, Audit | P1 |
| ADM-13 | Create a company by hand (sales-led): legal name, ICE, IF, RC, address, main admin email, then send the invite | P1 |
| ADM-14 | Self-signup from the website creates a company in a 14-day **trial** automatically | P1 |
| ADM-15 | Status changes: suspend (read-only access), reactivate, cancel. Each needs a reason and is logged | P1 |
| ADM-16 | Delete a company: super admin only, after a 30-day grace period, with a final data export sent to the company | P2 |
| ADM-17 | Internal notes and tags (for example "VIP" or "risk of churn") on a company | P2 |
| ADM-18 | Health score from logins, usage, payments and tickets | P3 |

### 4.3 Plans and features

| ID | Requirement | Prio |
|---|---|---|
| ADM-20 | Plans: Starter 490 MAD, Business 1 490 MAD and Enterprise 3 990 MAD a month before VAT; yearly = 10 months | P1 |
| ADM-21 | Each plan defines its seats, its modules (for example, payroll inputs and DGI only on Business and up), its storage and its support level | P1 |
| ADM-22 | Limits are enforced: no new user beyond the seats, and a module outside the plan is hidden, with an "Upgrade" message | P1 |
| ADM-23 | Add-ons: extra seats, extra storage | P2 |
| ADM-24 | Per-company overrides (an extra module or a custom price) with an end date | P2 |
| ADM-25 | Plan versions: a price change applies to new customers; existing customers keep their price until a date | P2 |

### 4.4 Subscriptions and Nexora billing

| ID | Requirement | Prio |
|---|---|---|
| ADM-30 | One subscription per company: plan, monthly or yearly, start date, next renewal, seats, discount | P1 |
| ADM-31 | Automatic Nexora invoices at each renewal: MAD, VAT 20%, Nexora SARL's ICE, IF and RC, gapless numbering | P1 |
| ADM-32 | Upgrade or downgrade during a period, with a prorata on the next invoice | P1 |
| ADM-33 | Payments: card (Moroccan payment provider), bank transfer (match it by hand or by bank import), cheque | P1 |
| ADM-34 | Dunning when a payment fails: reminders on day 1, 7 and 14, read-only on day 21, suspension on day 30 (all configurable) | P1 |
| ADM-35 | Credit notes and refunds, each with a reason | P1 |
| ADM-36 | Coupons and discounts (percentage or amount, duration), with a maximum per role | P2 |
| ADM-37 | Billing exports: sales journal, VAT collected, for Nexora's own accounting | P2 |

### 4.5 Users across companies

| ID | Requirement | Prio |
|---|---|---|
| ADM-40 | Search a user in every company by email or name | P1 |
| ADM-41 | Support actions: resend the invite, reset password or 2FA, unlock the account. Each is logged and the user is told by email | P1 |
| ADM-42 | Block a user (abuse or fraud), with a reason | P1 |
| ADM-43 | "View as", with read-only access to a company: only if the company admin has allowed it, for at most 1 hour, with a banner shown in the session; the company sees it in its own audit log | P2 |

### 4.6 Support

| ID | Requirement | Prio |
|---|---|---|
| ADM-50 | Tickets created from inside the ERP ("Help" button) or by email, linked to the company and the user | P1 |
| ADM-51 | Status (new, open, waiting for customer, solved), priority, assignee | P1 |
| ADM-52 | Response-time targets per plan (for example Enterprise 4 h, Business 1 day, Starter 2 days) | P2 |
| ADM-53 | Canned answers and links to the help documentation | P2 |
| ADM-54 | Announcements: message shown in every company's ERP, or only in chosen companies (maintenance, new feature) | P2 |

### 4.7 Platform operations

| ID | Requirement | Prio |
|---|---|---|
| ADM-60 | System health: errors, slow pages, background jobs (emails, reminders, DGI sending) | P1 |
| ADM-61 | Incidents: open, update and close them, with a public status page | P2 |
| ADM-62 | Feature flags: turn a new feature on for some companies first | P2 |
| ADM-63 | Company data export (all its data as a ZIP of CSV and PDF files) and restore from backup | P2 |
| ADM-64 | DGI e-invoicing monitor: invoices sent, accepted or rejected per company | P2 |

### 4.8 Security, audit and compliance

| ID | Requirement | Prio |
|---|---|---|
| ADM-70 | Every Nexora staff action is written to an audit log (who, what, which company, when, from where) that cannot be changed | P1 |
| ADM-71 | Nexora staff management: invite, role, 2FA required, deactivate on leaving | P1 |
| ADM-72 | Data requests: export or delete a person's data on request (law 09-08) | P2 |
| ADM-73 | Retention rules: invoices kept for 10 years (Moroccan law), logs for 1 year, deleted companies purged after 30 days | P2 |
| ADM-74 | Console reachable only through the Nexora sign-in, never by a company user (already in place) | P1 |

---

## 5. Business rules (summary)

1. A company is always in exactly **one** status: trial, active, overdue, suspended or cancelled.
2. At the end of a trial with no payment method, the company becomes read-only for 7 days, then suspended.
3. Seats = active users with a login; former employees without a login don't count.
4. Prices are before VAT; Nexora invoices add 20% VAT; amounts are in MAD.
5. An issued Nexora invoice is never edited; only a credit note can correct it.
6. Any discount above 20% needs Billing or a Super admin.
7. No Nexora staff member can see salaries or employee documents of a company, even in "view as".

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | Server-side permission checks on every action, 2FA for all Nexora staff, sessions expire after 8 h |
| Data isolation | Each company's data is separated; the console reads summaries (counts, amounts), not the details |
| Performance | Company list under 1 s for 5,000 companies; dashboard under 2 s |
| Availability | 99.5% per month; backups daily, kept 30 days |
| Languages | Console in English and French first (the ERP stays in its 9 languages) |
| Accessibility | Same standard as the ERP (keyboard, screen readers, contrast) |
| Hosting | Data hosted in Morocco or with a CNDP-approved provider |

---

## 7. Screens (menu "Nexora admin")

1. Dashboard
2. Companies → company page (tabs)
3. Subscriptions
4. Nexora invoices and payments
5. Plans and add-ons
6. Users (all companies)
7. Support tickets and announcements
8. System health and incidents
9. Audit log
10. Nexora team (staff and roles)
11. Settings (Nexora SARL legal details, taxes, dunning, email templates)

---

## 8. Delivery plan

| Lot | Content | Depends on |
|---|---|---|
| **Lot 1, front end on demo data** (can start now) | Dashboard, Companies list and page, plan limits shown, subscriptions, Nexora invoices, console roles, audit list | Nothing |
| **Lot 2, with the backend (Phase 7)** | Real sign-in and server permissions, automatic invoicing and card payment, dunning emails, limits enforced, support tickets | Server, email, payment provider |
| **Lot 3, later** | View as, health score, feature flags, status page, data requests, DGI monitor | Lot 2 |

---

## 9. Acceptance criteria (examples)

- A Sales user creates a company: the admin receives an invite, the company appears as **trial**, and the action is in the audit log.
- A card payment fails: the company shows **overdue**, reminders go out on day 1, 7 and 14, and on day 30 it is suspended (read-only) without data loss.
- A Starter company tries to add a 6th user beyond its seats: it is refused with an "Upgrade" message.
- A Support agent can reset a user's 2FA, but cannot open the company's invoices without consent.
- A company admin never sees the "Nexora admin" menu, even by typing its address.
