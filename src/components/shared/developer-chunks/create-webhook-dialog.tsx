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
import { AVAILABLE_WEBHOOK_EVENTS, WebhookEndpoint } from "@/lib/demo-data/developer"
import { createWebhookApi } from "@/lib/api/developer-apis"
import { toast } from "sonner"

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWebhookCreated: (webhook: WebhookEndpoint) => void
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  onWebhookCreated,
}: CreateWebhookDialogProps) {
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "invoice.paid",
    "subscription.updated",
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEventToggle = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== eventId))
    } else {
      setSelectedEvents([...selectedEvents, eventId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim().startsWith("http://") && !url.trim().startsWith("https://")) {
      toast.error("Webhook destination must be a valid HTTP or HTTPS URL")
      return
    }
    if (selectedEvents.length === 0) {
      toast.error("Please subscribe to at least one webhook event")
      return
    }

    setIsSubmitting(true)
    try {
      const webhook = await createWebhookApi(url.trim(), selectedEvents)
      onWebhookCreated(webhook)
      toast.success("Webhook endpoint registered")
      setUrl("")
      setSelectedEvents(["invoice.paid", "subscription.updated"])
      onOpenChange(false)
    } catch {
      toast.error("Failed to register webhook endpoint")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Register Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Receive real-time HTTP POST notifications when events occur within your Nexora account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://api.yourdomain.com/webhooks/nexora"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2.5">
            <Label>Subscribed Topics</Label>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 max-h-56 overflow-y-auto">
              {AVAILABLE_WEBHOOK_EVENTS.map((event) => {
                const isChecked = selectedEvents.includes(event.id)
                return (
                  <label
                    key={event.id}
                    className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleEventToggle(event.id)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        {event.label}{" "}
                        <span className="text-[11px] font-mono text-muted-foreground font-normal">
                          ({event.id})
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {event.description}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Add Endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
