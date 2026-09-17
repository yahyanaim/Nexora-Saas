"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabItem } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ApiKeysCard } from "./api-keys-card"
import { WebhooksCard } from "./webhooks-card"
import { QuickDocsCard } from "./quick-docs-card"
import { getApiKeysApi, getWebhooksApi } from "@/lib/api/developer-apis"
import { ApiKey, WebhookEndpoint, initialApiKeys, initialWebhooks } from "@/lib/demo-data/developer"
import { Terminal, Key, Webhook, Code, Activity, ShieldCheck } from "@/components/ui/carbon/icons"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"

export default function DeveloperPage() {
  const t = useTranslations()
  const [keys, setKeys] = useState<ApiKey[]>(initialApiKeys)
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(initialWebhooks)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const [loadedKeys, loadedWebhooks] = await Promise.all([
          getApiKeysApi(),
          getWebhooksApi(),
        ])
        if (mounted) {
          setKeys(loadedKeys)
          setWebhooks(loadedWebhooks)
        }
      } catch (err) {
        console.error("Failed to load developer data:", err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const activeKeysCount = keys.filter((k) => k.status === "active").length

  const metricCards: MetricCardItem[] = useMemo(
    () => [
      {
        key: "activeKeys",
        title: "Active API Keys",
        value: activeKeysCount,
        badge: {
          label: "Active",
          icon: Key,
          variant: "outline",
          className: "gap-1 border-primary/20 bg-primary/10 text-primary",
        },
        footer: {
          icon: Key,
          text: "Programmatic access credentials",
        },
      },
      {
        key: "webhooks",
        title: "Webhook Endpoints",
        value: webhooks.length,
        badge: {
          label: "Live",
          icon: Webhook,
          variant: "outline",
          className:
            "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        footer: {
          icon: Webhook,
          text: "Outbound event subscribers",
        },
      },
      {
        key: "gatewayStatus",
        title: "API Gateway Status",
        value: "99.98%",
        valueClassName: "text-emerald-600 dark:text-emerald-400",
        badge: {
          label: "Operational",
          icon: Activity,
          variant: "outline",
          className:
            "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        footer: {
          icon: Activity,
          text: "Global edge latency: ~24ms",
        },
      },
      {
        key: "monthlyQuota",
        title: "Monthly Gateway Limit",
        value: "100k req",
        badge: {
          label: "84.2% used",
          icon: Terminal,
          variant: "outline",
          className:
            "gap-1 border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        footer: {
          icon: Terminal,
          text: "Resets automatically each month",
        },
      },
    ],
    [activeKeysCount, webhooks.length]
  )

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "api-keys",
        label: "API Keys",
        icon: <Key className="size-3.5" />,
        content: <ApiKeysCard initialKeys={keys} />,
      },
      {
        id: "webhooks",
        label: "Webhooks",
        icon: <Webhook className="size-3.5" />,
        content: <WebhooksCard initialWebhooks={webhooks} />,
      },
      {
        id: "docs",
        label: "Quickstart & Docs",
        icon: <Code className="size-3.5" />,
        content: <QuickDocsCard />,
      },
    ],
    [keys, webhooks]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("developer") || "Developer & API"}
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex gap-1 text-xs font-normal border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
            >
              <ShieldCheck className="size-3" />
              REST API v1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate scoped personal access tokens, configure webhook subscribers, and inspect integration documentation.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <MetricCardGrid cards={metricCards} isLoading={isLoading} />

      {/* Main Tabs Workspace */}
      <Tabs tabs={tabs} defaultTabId="api-keys" />
    </div>
  )
}
