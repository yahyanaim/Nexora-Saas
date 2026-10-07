"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Smartphone, X } from "@/components/ui/carbon/icons"

/** Registers the service worker once the page has loaded (Phase 6h.3). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined)
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED = "nexora_install_hint_dismissed"

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Shown once on phones: "Add Nexora to your home screen". Chrome and Edge get
 * an Install button; Safari on iPhone gets the Share → Add to Home Screen steps.
 */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone
    const phone = window.matchMedia("(max-width: 768px)").matches
    if (installed || !phone || read(DISMISSED)) return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    // Safari has no install event: show the steps a moment after the page opens
    const timer = /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? window.setTimeout(() => {
          setIos(true)
          setVisible(true)
        }, 1500)
      : undefined
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISSED, "1")
    } catch {
      // private mode: the hint simply comes back next time
    }
  }

  if (!visible) return null
  return <InstallCard ios={ios} prompt={prompt} onDismiss={dismiss} />
}

function InstallCard({ ios, prompt, onDismiss: dismiss }: { ios: boolean; prompt: InstallPromptEvent | null; onDismiss: () => void }) {
  const t = useTranslations()
  return (
    <div role="dialog" aria-label={t("pwaInstallTitle")} className="fixed inset-x-3 bottom-3 z-50 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg md:hidden">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("pwaInstallTitle")}</p>
        <p className="text-xs text-muted-foreground">{ios ? t("pwaInstallIos") : t("pwaInstallHint")}</p>
        {prompt && (
          <Button
            size="sm"
            className="mt-2"
            onClick={async () => {
              await prompt.prompt()
              await prompt.userChoice
              dismiss()
            }}
          >
            {t("pwaInstall")}
          </Button>
        )}
      </div>
      <Button size="icon-sm" variant="ghost" aria-label={t("close")} onClick={dismiss}><X className="size-4" /></Button>
    </div>
  )
}
