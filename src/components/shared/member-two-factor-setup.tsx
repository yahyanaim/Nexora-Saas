"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, QrCode, ShieldCheck } from "@/components/ui/carbon/icons"
import { enable2FaApi, setup2FaApi } from "@/lib/api/auth-apis"
import { translateError } from "@/lib/errors/translate-error"

/**
 * IAM-05: owners, administrators and accountants see only this page, whatever
 * company page they open, until their authenticator app gives the first code.
 * The server makes the secret and shows it once; the recovery codes are shown
 * once too. Same steps as the console's gate (STF-03).
 */
export function MemberTwoFactorSetup({ name, onDone }: { name: string; onDone: () => void }) {
  const t = useTranslations()
  const [setup, setSetup] = useState<{ secret: string; qrCodeUrl: string } | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const start = useMutation({
    mutationFn: setup2FaApi,
    onSuccess: setSetup,
    onError: (error) => toast.error(translateError(error, t)),
  })
  // A fresh secret each time the page opens: the server keeps the one waiting for its first code.
  useEffect(() => {
    start.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!setup?.qrCodeUrl) return
    let alive = true
    void import("qrcode")
      .then((QR) => QR.toDataURL(setup.qrCodeUrl, { width: 200, margin: 1 }))
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [setup])

  const enable = useMutation({
    mutationFn: () => enable2FaApi(code, password),
    onSuccess: (data) => setRecoveryCodes(data.recoveryCodes),
    onError: (error) => {
      setCode("")
      toast.error(translateError(error, t))
    },
  })

  if (recoveryCodes) {
    return (
      <div className="p-4 md:p-6">
        <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-panel md:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success"><CheckCircle className="size-5" /></span>
            <div>
              <h1 className="text-xl font-semibold">{t("tfRecoveryTitle")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("tfRecoveryHint")}</p>
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-4 font-mono text-sm sm:grid-cols-3" aria-label={t("tfRecoveryTitle")}>
            {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(recoveryCodes.join("\n"))}>{t("copy")}</Button>
            <Button onClick={onDone}>{t("tfRecoveryDone")}</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-panel md:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
          <div>
            <h1 className="text-xl font-semibold">{t("tfTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("tfMemberIntro", { name })}</p>
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
                {qr ? <img src={qr} alt={t("tfQrAlt")} width={184} height={184} /> : <QrCode className="size-16 text-muted-foreground" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">{t("tfKeyLabel")}</p>
                <p className="break-all font-mono text-sm tracking-wider">{setup?.secret.match(/.{1,4}/g)?.join(" ") ?? "…"}</p>
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
                enable.mutate()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="tf-code">{t("tfCode")}</Label>
                <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-40 font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tf-password">{t("password")}</Label>
                <Input id="tf-password" type="password" autoComplete="current-password" className="w-56" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="tf-password-hint" />
                <p id="tf-password-hint" className="text-xs text-muted-foreground">{t("tfPasswordHint")}</p>
              </div>
              <Button type="submit" disabled={code.length !== 6 || !password || !setup || enable.isPending}><CheckCircle className="size-4" />{t("tfMemberTurnOn")}</Button>
            </form>
          </li>
        </ol>
        <p className="mt-6 rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("tfMemberWhy")}</p>
      </section>
    </div>
  )
}
