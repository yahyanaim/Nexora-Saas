"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabItem } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ApiKeysCard } from "./api-keys-card"
import { WebhooksCard } from "./webhooks-card"
import { QuickDocsCard } from "./quick-docs-card"
import { getApiKeysApi, getWebhooksApi } from "@/lib/api/developer-apis"
import { ApiKey, WebhookEndpoint, initialApiKeys, initialWebhooks } from "@/lib/demo-data/developer"
import { Terminal, Key, Webhook, Code, Activity, ShieldCheck } from "@/components/ui/carbon/icons"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"
import { PageHeader } from "@/components/shared/page-header"
import { logger } from "@/lib/logger"
import { useTranslations } from "next-intl"

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
        logger.error("Failed to load developer data:", err)
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
        title: t("dv_kpiKeys"),
        value: activeKeysCount,
        badge: {
          label: t("dv_active"),
          icon: Key,
          variant: "outline",
          className: "gap-1 border-primary/20 bg-primary/10 text-primary",
        },
        footer: {
          icon: Key,
          text: t("dv_kpiKeysFoot"),
        },
      },
      {
        key: "webhooks",
        title: t("dv_webhooks"),
        value: webhooks.length,
        badge: {
          label: t("dv_live"),
          icon: Webhook,
          variant: "outline",
          className:
            "gap-1 border-success/20 bg-success-soft text-success-foreground",
        },
        footer: {
          icon: Webhook,
          text: t("dv_kpiHooksFoot"),
        },
      },
      {
        key: "gatewayStatus",
        title: t("dv_gateway"),
        value: "99.98%",
        valueClassName: "text-success-foreground",
        badge: {
          label: t("dv_operational"),
          icon: Activity,
          variant: "outline",
          className:
            "gap-1 border-success/20 bg-success-soft text-success-foreground",
        },
        footer: {
          icon: Activity,
          text: t("dv_latency", { ms: 24 }),
        },
      },
      {
        key: "monthlyQuota",
        title: t("dv_quota"),
        value: t("dv_quotaValue", { count: 100 }),
        badge: {
          label: t("dv_quotaUsed", { pct: 84.2 }),
          icon: Terminal,
          variant: "outline",
          className:
            "gap-1 border-primary/20 bg-info-soft text-info-foreground",
        },
        footer: {
          icon: Terminal,
          text: t("dv_quotaFoot"),
        },
      },
    ],
    [activeKeysCount, webhooks.length, t]
  )

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "api-keys",
        label: t("dv_apiKeys"),
        icon: <Key className="size-3.5" />,
        content: <ApiKeysCard initialKeys={keys} />,
      },
      {
        id: "webhooks",
        label: t("dv_tabWebhooks"),
        icon: <Webhook className="size-3.5" />,
        content: <WebhooksCard initialWebhooks={webhooks} />,
      },
      {
        id: "docs",
        label: t("dv_tabDocs"),
        icon: <Code className="size-3.5" />,
        content: <QuickDocsCard />,
      },
    ],
    [keys, webhooks, t]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        badge={
          <Badge variant="info" className="hidden sm:inline-flex">
            <ShieldCheck />
            REST API v1
          </Badge>
        }
        description={t("dv_pageHint")}
      />

      {/* KPI Metric Summary Cards */}
      <MetricCardGrid cards={metricCards} isLoading={isLoading} />

      {/* Main Tabs Workspace */}
      <Tabs tabs={tabs} defaultTabId="api-keys" />
    </div>
  )
}
