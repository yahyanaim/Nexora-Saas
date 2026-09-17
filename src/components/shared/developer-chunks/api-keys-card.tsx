"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApiKey } from "@/lib/demo-data/developer"
import { revokeApiKeyApi } from "@/lib/api/developer-apis"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import { Plus, Key, Copy, Check, Trash2, Clock } from "@/components/ui/carbon/icons"
import { formatDate } from "@/lib/utils/format-date"
import { toast } from "sonner"

interface ApiKeysCardProps {
  initialKeys: ApiKey[]
}

export function ApiKeysCard({ initialKeys }: ApiKeysCardProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (key: ApiKey) => {
    navigator.clipboard.writeText(key.tokenPrefix)
    setCopiedId(key.id)
    toast.success(`Copied token prefix for "${key.name}"`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke "${name}"? Any service using this key will immediately lose access.`)) {
      return
    }
    try {
      await revokeApiKeyApi(id)
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k))
      )
      toast.success(`Revoked API key "${name}"`)
    } catch {
      toast.error("Failed to revoke API key")
    }
  }

  const handleKeyCreated = (newKey: ApiKey) => {
    setKeys((prev) => [newKey, ...prev])
  }

  return (
    <Card className="rounded-xl border-border/60 bg-card shadow-xs">
      <CardHeader className="p-5 md:p-6 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <span>API Keys</span>
              <Badge variant="outline" className="text-xs font-normal">
                {keys.filter((k) => k.status === "active").length} Active
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage personal and service credentials to authenticate programmatic requests.
            </CardDescription>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>Generate New Key</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
              <Key className="size-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No API keys generated</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Generate an API key to allow external tools and workflows to integrate with your workspace.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 gap-1.5"
            >
              <Plus className="size-4" />
              <span>Generate New Key</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {keys.map((key) => {
              const isRevoked = key.status === "revoked"
              const isCopied = copiedId === key.id

              return (
                <div
                  key={key.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 transition-colors ${
                    isRevoked ? "opacity-55 bg-muted/20" : "hover:bg-muted/10"
                  }`}
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{key.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-2 py-0 h-4.5 ${
                          isRevoked
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {key.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted/60 px-2 py-0.5 font-mono text-xs text-foreground/80 border border-border/50">
                        {key.tokenPrefix}
                      </code>
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => handleCopy(key)}
                          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          title="Copy token prefix"
                        >
                          {isCopied ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-flex items-center rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-mono text-secondary-foreground"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 text-xs text-muted-foreground shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                    <div className="flex flex-col items-start md:items-end">
                      <span>Created: {formatDate(key.createdAt)}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        {key.lastUsedAt ? `Last used: ${formatDate(key.lastUsedAt)}` : "Never used"}
                      </span>
                    </div>

                    {!isRevoked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2.5 h-8 text-xs"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Revoke</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CreateApiKeyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onKeyCreated={handleKeyCreated}
      />
    </Card>
  )
}
