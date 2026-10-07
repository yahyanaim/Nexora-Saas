"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { useConsoleActor, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { CONSOLE_MATRIX } from "@/lib/platform/console-roles"
import { cn } from "@/lib/utils"
import { CONSOLE_ROLES, ConsoleCapability, type ConsoleGrant } from "@/types/platform-console"
import { ROLE_LABEL } from "./console-shared"

const CAPABILITY_LABEL: Record<ConsoleCapability, string> = {
  [ConsoleCapability.VIEW_CUSTOMERS]: "capViewCustomers",
  [ConsoleCapability.CREATE_TRIAL]: "capCreateTrial",
  [ConsoleCapability.CHANGE_STATUS]: "capChangeStatus",
  [ConsoleCapability.SUSPEND]: "capSuspend",
  [ConsoleCapability.CHANGE_PLANS]: "capChangePlans",
  [ConsoleCapability.CHANGE_SUBSCRIPTION]: "capChangeSubscription",
  [ConsoleCapability.CREDIT_NOTES]: "capCreditNotes",
  [ConsoleCapability.REFUND_SMALL]: "capRefundSmall",
  [ConsoleCapability.REFUND_LARGE]: "capRefundLarge",
  [ConsoleCapability.SUPPORT_SESSION]: "capSupportSession",
  [ConsoleCapability.INCIDENTS]: "capIncidents",
  [ConsoleCapability.MANAGE_STAFF]: "capManageStaff",
  [ConsoleCapability.EXPORT_AUDIT]: "capExportAudit",
  [ConsoleCapability.DELETE_CUSTOMER]: "capDeleteCustomer",
}

const GRANT: Record<ConsoleGrant, { key: string; className: string }> = {
  yes: { key: "grantYes", className: "bg-success-soft text-success-foreground" },
  "2fa": { key: "grant2fa", className: "bg-info-soft text-info-foreground" },
  "2fa_2p": { key: "grant2fa2p", className: "bg-warning-soft text-warning-foreground" },
  staff: { key: "grantStaff", className: "bg-info-soft text-info-foreground" },
  no: { key: "grantNo", className: "text-muted-foreground" },
}

/** The seven console roles and what each may do (Table 23). Read-only: custom roles are not allowed (STF-04). */
export default function ConsoleRolesPage() {
  const t = useTranslations()
  const actor = useConsoleActor()
  const { data: staff = [] } = useConsoleStaff()
  const holders = (role: string) => staff.filter((s) => s.role === role && s.status !== "removed").length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="text-base font-semibold">{t("rlMatrixTitle")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("rlMatrixIntro")}</p>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rlCapability")}</TableHead>
                {CONSOLE_ROLES.map((r) => (
                  <TableHead key={r} className={cn("text-center", actor?.role === r && "text-primary")}>
                    {t(ROLE_LABEL[r])}
                    <span className="block text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{t("rlHolders", { count: holders(r) })}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(ConsoleCapability).map((cap) => (
                <TableRow key={cap}>
                  <TableCell className="font-medium">{t(CAPABILITY_LABEL[cap])}</TableCell>
                  {CONSOLE_ROLES.map((r) => {
                    const g = GRANT[CONSOLE_MATRIX[cap][r]]
                    return (
                      <TableCell key={r} className={cn("text-center", actor?.role === r && "bg-primary/5")}>
                        <Badge variant="outline" className={cn("border-transparent", g.className)}>{t(g.key)}</Badge>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>{t("rlLegend2fa")}</li>
          <li>{t("rlLegend2p")}</li>
          <li>{t("rlLegendStaff")}</li>
          <li>{t("rlLegendData")}</li>
        </ul>
      </section>
    </div>
  )
}
