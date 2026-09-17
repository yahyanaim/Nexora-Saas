export interface AuditLogActor {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

export type AuditLogCategory = "Security" | "Billing" | "Team" | "API" | "System"

export type AuditLogStatus = "success" | "warning" | "error"

export interface AuditLogEntry {
  id: string
  actor: AuditLogActor
  action: string
  actionKey: string
  category: AuditLogCategory
  targetResource: string
  ipAddress: string
  location: string
  status: AuditLogStatus
  details?: string
  createdAt: string
}

export const demoAuditLogs: AuditLogEntry[] = [
  {
    id: "aud_01HZX8901",
    actor: {
      id: "usr_alex_01",
      name: "Alex Morgan",
      email: "alex.morgan@company.io",
      avatar: "/avatars/alex-morgan.jpg",
      role: "Admin",
    },
    action: "Sanction Enforced",
    actionKey: "security.sanction_enforced",
    category: "Security",
    targetResource: "User: Viktor Reznov (Account Restricted)",
    ipAddress: "192.168.1.42",
    location: "New York, US",
    status: "warning",
    details: "Automated rate-limit threshold violation detected from unauthorized API key.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
  },
  {
    id: "aud_01HZX8902",
    actor: {
      id: "usr_sarah_02",
      name: "Sarah Chen",
      email: "sarah.chen@company.io",
      avatar: "/avatars/sarah-chen.jpg",
      role: "Lead Designer",
    },
    action: "Subscription Upgrade",
    actionKey: "billing.plan_upgraded",
    category: "Billing",
    targetResource: "Plan: Enterprise Tier ($1,250/mo)",
    ipAddress: "104.28.19.88",
    location: "San Francisco, US",
    status: "success",
    details: "Successfully upgraded seat capacity from 5 to 25 seats via Stripe Checkout.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: "aud_01HZX8903",
    actor: {
      id: "usr_sys_cron",
      name: "Nexora Cron Engine",
      email: "system@internal.nexora.io",
      role: "System Service",
    },
    action: "Invoice Payment Processed",
    actionKey: "billing.invoice_paid",
    category: "Billing",
    targetResource: "Invoice: #INV-2024-001 ($4,500.00)",
    ipAddress: "10.0.4.12",
    location: "AWS us-east-1",
    status: "success",
    details: "Automated recurring billing charge cleared via Stripe Webhook.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hrs ago
  },
  {
    id: "aud_01HZX8904",
    actor: {
      id: "usr_marcus_03",
      name: "Marcus Vance",
      email: "marcus.vance@company.io",
      avatar: "/avatars/marcus-vance.jpg",
      role: "Software Architect",
    },
    action: "Role Granted",
    actionKey: "team.role_granted",
    category: "Team",
    targetResource: "User: Sophia Vance -> DevOps Engineer",
    ipAddress: "84.17.52.91",
    location: "London, UK",
    status: "success",
    details: "Granted infrastructure deployment and cluster monitoring privileges.",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hrs ago
  },
  {
    id: "aud_01HZX8905",
    actor: {
      id: "usr_elena_04",
      name: "Elena Rostova",
      email: "elena.rostova@company.io",
      avatar: "/avatars/elena-rostova.jpg",
      role: "European Tech Lead",
    },
    action: "API Key Generated",
    actionKey: "api.key_created",
    category: "API",
    targetResource: "Key: prod-ci-deployment-token (nex_live_...)",
    ipAddress: "185.220.101.5",
    location: "Berlin, DE",
    status: "success",
    details: "Scoped credentials created with read:users and write:invoices permissions.",
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hrs ago
  },
  {
    id: "aud_01HZX8906",
    actor: {
      id: "usr_gateway",
      name: "Security Gateway",
      email: "guard@nexora.io",
      role: "WAF Sentinel",
    },
    action: "Brute Force Blocked",
    actionKey: "security.auth_failure",
    category: "Security",
    targetResource: "Endpoint: POST /api/auth/login",
    ipAddress: "194.26.29.112",
    location: "Kyiv, UA",
    status: "error",
    details: "Repeated invalid OTP submissions blocked by IP throttling guard.",
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hrs ago
  },
  {
    id: "aud_01HZX8907",
    actor: {
      id: "usr_david_05",
      name: "David Kim",
      email: "david.kim@company.io",
      avatar: "/avatars/david-kim.jpg",
      role: "Startup Founder",
    },
    action: "Webhook Endpoint Registered",
    actionKey: "api.webhook_created",
    category: "API",
    targetResource: "URL: https://api.partner.com/v1/nexora-events",
    ipAddress: "211.36.142.8",
    location: "Seoul, KR",
    status: "success",
    details: "Subscribed to invoice.paid, subscription.renewed, and user.created topics.",
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), // 1 day ago
  },
  {
    id: "aud_01HZX8908",
    actor: {
      id: "usr_alex_01",
      name: "Alex Morgan",
      email: "alex.morgan@company.io",
      avatar: "/avatars/alex-morgan.jpg",
      role: "Admin",
    },
    action: "Multi-Tenant Workspace Created",
    actionKey: "team.workspace_created",
    category: "Team",
    targetResource: "Workspace: Acme Cloud Ventures",
    ipAddress: "192.168.1.42",
    location: "New York, US",
    status: "success",
    details: "Initialized secondary workspace with isolated billing and team partitions.",
    createdAt: new Date(Date.now() - 1000 * 60 * 2880).toISOString(), // 2 days ago
  },
]
