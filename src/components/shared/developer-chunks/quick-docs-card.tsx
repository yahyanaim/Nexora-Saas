"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabItem } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Terminal, Copy, Check, Code } from "@/components/ui/carbon/icons"
import { toast } from "sonner"

const SNIPPETS = {
  curl: `curl -X GET "https://api.nexora.io/v1/users" \\
  -H "Authorization: Bearer nex_live_YOUR_TOKEN" \\
  -H "Content-Type: application/json"`,

  typescript: `import axios from "axios";

const nexora = axios.create({
  baseURL: "https://api.nexora.io/v1",
  headers: {
    Authorization: "Bearer nex_live_YOUR_TOKEN",
    "Content-Type": "application/json",
  },
});

// Fetch active users directory
const response = await nexora.get("/users");
console.log("Active users:", response.data);`,

  python: `import requests

headers = {
    "Authorization": "Bearer nex_live_YOUR_TOKEN",
    "Content-Type": "application/json"
}

# Fetch active users directory
response = requests.get("https://api.nexora.io/v1/users", headers=headers)
print("Active users:", response.json())`,
}

export function QuickDocsCard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (key: keyof typeof SNIPPETS) => {
    navigator.clipboard.writeText(SNIPPETS[key])
    setCopiedKey(key)
    toast.success(`Copied ${key.toUpperCase()} snippet to clipboard`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const renderSnippet = (lang: keyof typeof SNIPPETS, label: string) => (
    <div className="rounded-xl border border-border/60 bg-neutral-950 p-4 text-neutral-100 font-mono text-xs overflow-x-auto">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-neutral-400 text-[11px]">
        <span className="flex items-center gap-1.5">
          <Code className="size-3.5" />
          <span>{label}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopy(lang)}
          className="h-7 px-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 gap-1"
        >
          {copiedKey === lang ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          <span>{copiedKey === lang ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="text-xs leading-relaxed select-all">
        <code>{SNIPPETS[lang]}</code>
      </pre>
    </div>
  )

  const tabs: TabItem[] = [
    {
      id: "curl",
      label: "cURL",
      content: renderSnippet("curl", "Shell Command"),
    },
    {
      id: "typescript",
      label: "TypeScript",
      content: renderSnippet("typescript", "Node.js / Bun"),
    },
    {
      id: "python",
      label: "Python",
      content: renderSnippet("python", "Python 3.x"),
    },
  ]

  return (
    <Card className="rounded-xl border-border/60 bg-card shadow-xs">
      <CardHeader className="p-5 md:p-6 border-b border-border/50">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            <span>API Quickstart & SDK Reference</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Integrate Nexora endpoints into backend services, microservices, or workflow automations.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6 space-y-5">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Base URL
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              HTTPS TLS 1.3
            </span>
          </div>
          <code className="block rounded-lg bg-background p-2.5 font-mono text-xs text-foreground border border-border/60">
            https://api.nexora.io/v1
          </code>
        </div>

        <Tabs tabs={tabs} defaultTabId="curl" />
      </CardContent>
    </Card>
  )
}
