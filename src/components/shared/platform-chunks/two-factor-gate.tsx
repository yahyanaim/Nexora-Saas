"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListSkeleton } from "@/components/ui/empty-state"
import { CheckCircle, QrCode, ShieldCheck } from "@/components/ui/carbon/icons"
import { useConsoleMe, useEnableTwoFactor } from "@/hooks/platform/use-platform-console"
import type { PlatformStaff } from "@/types/platform-console"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/** Demo set-up key, stable for one member; the server generates and stores the real secret. */
function setupKey(staff: PlatformStaff) {
  let h = 2166136261
  let out = ""
  for (let i = 0; i < 32; i++) {
    h = Math.imul(h ^ (staff.id.charCodeAt(i % staff.id.length) + i), 16777619)
    out += BASE32[(h >>> 0) % 32]
  }
  return out
}

/**
 * STF-03: a team member who has not set up two-factor authentication sees
 * only this page, whatever console page they open, until the code from their
 * authenticator app turns it on.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useConsoleMe()
  if (isLoading) return <div className="p-4 md:p-6"><ListSkeleton /></div>
  if (me && !me.twoFactor) return <TwoFactorSetup staff={me} />
  return <>{children}</>
}

function TwoFactorSetup({ staff }: { staff: PlatformStaff }) {
  const t = useTranslations()
  const enable = useEnableTwoFactor()
  const [code, setCode] = useState("")
  const [qr, setQr] = useState<string | null>(null)
  const key = useMemo(() => setupKey(staff), [staff])
  const uri = `otpauth://totp/Nexora%20console:${encodeURIComponent(staff.email)}?secret=${key}&issuer=Nexora`

  useEffect(() => {
    let alive = true
    void import("qrcode").then((QR) => QR.toDataURL(uri, { width: 200, margin: 1 })).then((url) => alive && setQr(url)).catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [uri])

  return (
    <div className="p-4 md:p-6">
      <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-panel md:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
          <div>
            <h1 className="text-xl font-semibold">{t("tfTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("tfIntro", { name: staff.name })}</p>
          </div>
        </div>
        <ol className="mt-6 space-y-6">
          <li>
            <h2 className="text-sm font-semibold">1. {t("tfStep1")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("tfStep1Hint")}</p>
          </li>
          <li>
            <h2 className="text-sm font-semibold">2. {t("tfStep2")}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <div className="grid size-[200px] place-items-center rounded-2xl border border-border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise */}
                {qr ? <img src={qr} alt={t("tfQrAlt")} width={184} height={184} /> : <QrCode className="size-16 text-muted-foreground" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">{t("tfKeyLabel")}</p>
                <p className="break-all font-mono text-sm tracking-wider">{key.match(/.{1,4}/g)!.join(" ")}</p>
                <p className="text-xs text-muted-foreground">{t("tfKeyHint")}</p>
              </div>
            </div>
          </li>
          <li>
            <h2 className="text-sm font-semibold">3. {t("tfStep3")}</h2>
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                enable.mutate({ staffId: staff.id, code })
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="tf-code">{t("tfCode")}</Label>
                <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-40 font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              </div>
              <Button type="submit" disabled={code.length !== 6 || enable.isPending}><CheckCircle className="size-4" />{t("tfTurnOn")}</Button>
            </form>
          </li>
        </ol>
        <p className="mt-6 rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("tfWhy")}</p>
      </section>
    </div>
  )
}
