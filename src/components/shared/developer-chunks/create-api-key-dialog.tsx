"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AVAILABLE_SCOPES } from "@/lib/demo-data/developer"
import { createApiKeyApi } from "@/lib/api/developer-apis"
import { ApiKey } from "@/lib/demo-data/developer"
import { Copy, Check, Warning, Key } from "@/components/ui/carbon/icons"
import { toast } from "sonner"

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: (key: ApiKey) => void
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onKeyCreated,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:users"])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  const handleScopeToggle = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeId))
    } else {
      setSelectedScopes([...selectedScopes, scopeId])
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please provide a name for this API key")
      return
    }
    if (selectedScopes.length === 0) {
      toast.error("Select at least one permission scope")
      return
    }

    setIsSubmitting(true)
    try {
      const { apiKey, fullToken } = await createApiKeyApi(name.trim(), selectedScopes)
      setRevealedToken(fullToken)
      onKeyCreated(apiKey)
      toast.success("API key generated successfully")
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!revealedToken) return
    navigator.clipboard.writeText(revealedToken)
    setHasCopied(true)
    toast.success("Copied API key to clipboard")
    setTimeout(() => setHasCopied(false), 2500)
  }

  const handleClose = () => {
    setRevealedToken(null)
    setName("")
    setSelectedScopes(["read:users"])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        {revealedToken ? (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Key className="size-5" />
                <DialogTitle>API Key Generated</DialogTitle>
              </div>
              <DialogDescription>
                Copy your secret key now. For your security, this key cannot be viewed again once you close this modal.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <Warning className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Treat this key like a password. Do not commit it to public repositories or expose it in client-side code.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Your API Secret Token</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={revealedToken}
                  className="font-mono text-xs bg-muted/60 border-border select-all"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5 shrink-0"
                >
                  {hasCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{hasCopied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="default" onClick={handleClose} className="w-full">
                Done & Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Create programmatic credentials to securely interact with the Nexora REST API.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production Backend Worker, Zapier Sync"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2.5">
              <Label>Permission Scopes</Label>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 max-h-56 overflow-y-auto">
                {AVAILABLE_SCOPES.map((scope) => {
                  const isChecked = selectedScopes.includes(scope.id)
                  return (
                    <label
                      key={scope.id}
                      className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleScopeToggle(scope.id)}
                        className="mt-0.5"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {scope.label}{" "}
                          <span className="text-[11px] font-mono text-muted-foreground font-normal">
                            ({scope.id})
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {scope.description}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Generating..." : "Generate Key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
