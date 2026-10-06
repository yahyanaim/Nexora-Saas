"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSettingsMutations } from "@/hooks/workforce/use-settings"
import { ACCOUNT_KEYS, DEFAULT_ACCOUNTS } from "@/lib/workforce/journal"
import type { AccountKey } from "@/types/work-settings"

/** Account numbers of the journal export; blank uses the CGNC default (Phase 6e.4). */
export function AccountsTab({ initial }: { initial: Partial<Record<AccountKey, string>> }) {
  const t = useTranslations()
  const { accounts } = useSettingsMutations()
  const [form, setForm] = useState<Partial<Record<AccountKey, string>>>(initial)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountingAccounts")}</CardTitle>
        <CardDescription>{t("accountingAccountsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT_KEYS.map((key) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2">
              <span className="text-sm">{t(`acc_${key}`)}</span>
              <Input
                inputMode="numeric"
                className="h-9 w-28 text-right font-mono tabular-nums"
                placeholder={DEFAULT_ACCOUNTS[key]}
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setForm({})}>{t("useCgncDefaults")}</Button>
          <Button disabled={accounts.isPending} onClick={() => accounts.mutate(form)}>{t("save")}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
