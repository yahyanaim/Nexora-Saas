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
import { logger } from "@/lib/logger"
import { useTranslations } from "next-intl"

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
  const t = useTranslations()
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
      toast.error(t("dv_nameRequired"))
      return
    }
    if (selectedScopes.length === 0) {
      toast.error(t("dv_scopeRequired"))
      return
    }

    setIsSubmitting(true)
    try {
      const { apiKey, fullToken } = await createApiKeyApi(name.trim(), selectedScopes)
      setRevealedToken(fullToken)
      onKeyCreated(apiKey)
      toast.success(t("dv_keyCreated"))
    } catch (err) {
      logger.error(err)
      toast.error(t("dv_keyFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!revealedToken) return
    navigator.clipboard.writeText(revealedToken)
    setHasCopied(true)
    toast.success(t("dv_keyCopied"))
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
              <div className="flex items-center gap-2 text-success-foreground">
                <Key className="size-5" />
                <DialogTitle>{t("dv_keyGenerated")}</DialogTitle>
              </div>
              <DialogDescription>
                {t("dv_copyNow")}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-warning/20 bg-warning-soft p-3.5 flex items-start gap-3">
              <Warning className="size-4.5 text-warning-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-warning-foreground leading-relaxed">
                {t("dv_treatLikePassword")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api-key-token" className="text-xs font-medium">{t("dv_secretToken")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="api-key-token"
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
                  <span>{hasCopied ? t("dv_copied") : t("dv_copy")}</span>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="default" onClick={handleClose} className="w-full">
                {t("dv_doneClose")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("dv_newKeyTitle")}</DialogTitle>
              <DialogDescription>
                {t("dv_newKeyHint")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="key-name">{t("dv_keyName")}</Label>
              <Input
                id="key-name"
                placeholder={t("dv_keyNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2.5">
              <Label id="api-key-scopes">{t("dv_scopes")}</Label>
              <div role="group" aria-labelledby="api-key-scopes" className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 max-h-56 overflow-y-auto">
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
                          <span className="text-xs font-mono text-muted-foreground font-normal">
                            ({scope.id})
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
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
                {t("cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? t("dv_generating") : t("dv_generate")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
