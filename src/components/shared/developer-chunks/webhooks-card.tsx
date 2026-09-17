"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WebhookEndpoint } from "@/lib/demo-data/developer"
import { testWebhookPingApi } from "@/lib/api/developer-apis"
import { CreateWebhookDialog } from "./create-webhook-dialog"
import { Plus, Webhook, Eye, EyeOff, Copy, Send, CheckCircle } from "@/components/ui/carbon/icons"
import { formatDate } from "@/lib/utils/format-date"
import { toast } from "sonner"

interface WebhooksCardProps {
  initialWebhooks: WebhookEndpoint[]
}

export function WebhooksCard({ initialWebhooks }: WebhooksCardProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(initialWebhooks)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})
  const [pingingId, setPingingId] = useState<string | null>(null)

  const toggleSecret = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    toast.success("Signing secret copied to clipboard")
  }

  const handlePingTest = async (id: string, url: string) => {
    setPingingId(id)
    try {
      const res = await testWebhookPingApi(id)
      if (res.success) {
        toast.success(`Ping dispatched to ${url}! Response: ${res.statusCode} OK (${res.latencyMs}ms)`)
      }
    } catch {
      toast.error(`Ping failed for ${url}`)
    } finally {
      setPingingId(null)
    }
  }

  const handleWebhookCreated = (newWebhook: WebhookEndpoint) => {
    setWebhooks((prev) => [newWebhook, ...prev])
  }

  return (
    <Card className="rounded-xl border-border/60 bg-card shadow-xs">
      <CardHeader className="p-5 md:p-6 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Webhook className="size-4 text-emerald-600" />
              <span>Webhook Endpoints</span>
              <Badge variant="outline" className="text-xs font-normal">
                {webhooks.length} Active
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Deliver outbound HTTP events to your servers, Slack channels, or workflow automation tools.
            </CardDescription>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>Add Endpoint</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
              <Webhook className="size-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No webhook endpoints configured</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Add a webhook URL to receive real-time HTTP event notifications when data changes in your workspace.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Endpoint</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {webhooks.map((endpoint) => {
              const isRevealed = !!revealedSecrets[endpoint.id]
              const isPinging = pingingId === endpoint.id

              return (
                <div
                  key={endpoint.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 hover:bg-muted/10 transition-colors"
                >
                  <div className="space-y-2 min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-semibold text-foreground truncate">
                        {endpoint.url}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono px-2 py-0 h-4.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      >
                        <CheckCircle className="size-2.5 mr-1" />
                        {endpoint.status}
                      </Badge>
                    </div>

                    {/* Signing secret */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Signing Secret:</span>
                      <code className="rounded bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-foreground/80 border border-border/50">
                        {isRevealed ? endpoint.secretKey : "••••••••••••••••••••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => toggleSecret(endpoint.id)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                        title={isRevealed ? "Hide secret" : "Reveal secret"}
                      >
                        {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      {isRevealed && (
                        <button
                          type="button"
                          onClick={() => handleCopySecret(endpoint.secretKey)}
                          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          title="Copy secret"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Subscribed Events */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {endpoint.events.map((event) => (
                        <Badge
                          key={event}
                          variant="secondary"
                          className="text-[10px] font-mono px-1.5 py-0 h-4.5 bg-secondary/80 text-secondary-foreground"
                        >
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 text-xs text-muted-foreground shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                    <span className="hidden lg:inline text-xs">
                      Added {formatDate(endpoint.createdAt)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePingTest(endpoint.id, endpoint.url)}
                      disabled={isPinging}
                      className="gap-1.5 h-8 text-xs border-border/60 hover:bg-muted/60"
                    >
                      <Send className="size-3" />
                      <span>{isPinging ? "Testing..." : "Test Ping"}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CreateWebhookDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onWebhookCreated={handleWebhookCreated}
      />
    </Card>
  )
}
