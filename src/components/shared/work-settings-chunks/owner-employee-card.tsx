"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useSettingsMutations } from "@/hooks/workforce/use-settings"
import { EmployeeStatus } from "@/types/workforce"

const NONE = "__none__"

/**
 * Links the owner's sign-in account to an employee record, so the owner gets
 * their own My work page, KPIs and reviews, and can review the people who
 * report to them.
 */
export function OwnerEmployeeCard({ initial }: { initial?: string }) {
  const t = useTranslations()
  const { ownerEmployee } = useSettingsMutations()
  const { data: employees = [] } = useEmployees()
  const [value, setValue] = useState(initial || NONE)
  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE)
  const current = staff.find((e) => e.id === value)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ownerEmployee")}</CardTitle>
        <CardDescription>{t("ownerEmployeeHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-72" aria-label={t("ownerEmployee")}>
            <SelectValue>{current ? `${current.name} · ${current.jobTitle}` : t("ownerNotLinked")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("ownerNotLinked")}</SelectItem>
            {staff.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name} · {e.jobTitle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={ownerEmployee.isPending || value === (initial || NONE)} onClick={() => ownerEmployee.mutate(value === NONE ? null : value)}>
          {t("saveChanges")}
        </Button>
      </CardContent>
    </Card>
  )
}
