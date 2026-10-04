"use client"

import { useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Briefcase, CheckCircle, Clock, Plus, Users } from "@/components/ui/carbon/icons"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { EmployeeStatus, WorkRole, type Employee, type EmployeeInput } from "@/types/workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useDepartments, useEmployeeMutations, useEmployees } from "@/hooks/workforce/use-workforce"
import { getEmployeesColumns } from "./employees-columns"
import { EmployeeForm, type EmployeeFormHandle } from "./employee-form"
import { EmployeeProfileSheet } from "./employee-profile-sheet"
import { EMPLOYEE_STATUS_LABEL, WORK_ROLE_LABEL } from "./workforce-labels"

export default function EmployeesPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: departments = [] } = useDepartments()
  const { create, update, remove } = useEmployeeMutations()

  const canCreate = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_CREATE)
  const canEdit = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_UPDATE)
  const canDelete = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_DELETE)
  const canSeeCosts = can(authedUser, AdminPermissionsPlatform.COSTS_READ)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const formRef = useRef<EmployeeFormHandle>(null)

  const openForm = (employee: Employee | null) => {
    setEditing(employee)
    setFormOpen(true)
  }

  const handleValid = (input: EmployeeInput) => {
    const close = { onSuccess: () => setFormOpen(false) }
    if (editing) update.mutate({ id: editing.id, input }, close)
    else create.mutate(input, close)
  }

  const columns = useMemo(
    () =>
      getEmployeesColumns({
        t,
        departments,
        currency: workspace.currency,
        canEdit,
        canDelete,
        onView: setViewing,
        onEdit: openForm,
        onDelete: setDeleting,
      }),
    [t, departments, workspace.currency, canEdit, canDelete]
  )

  const cards = useMemo<MetricCardItem[]>(() => {
    const active = employees.filter((e) => e.status === EmployeeStatus.ACTIVE)
    const onLeave = employees.filter((e) => e.status === EmployeeStatus.ON_LEAVE).length
    const capacity = active.reduce((sum, e) => sum + e.weeklyCapacity, 0)
    const billable = active.filter((e) => e.billableRate > 0).length
    return [
      { key: "total", title: t("totalEmployees"), value: employees.length, footer: { icon: Users, text: t("acrossDepartments", { count: departments.length }) } },
      { key: "active", title: t("active"), value: active.length, valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("billableEmployees", { count: billable }) } },
      { key: "leave", title: t("onLeave"), value: onLeave, valueClassName: "text-warning-foreground", footer: { icon: Clock, text: t("currentlyAway") } },
      { key: "capacity", title: t("weeklyCapacity"), value: `${capacity} h`, valueClassName: "text-primary", footer: { icon: Briefcase, text: t("plannableHours") } },
    ]
  }, [employees, departments.length, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <DataTable
        title={t("employees")}
        isLoading={isLoading}
        columns={columns}
        data={employees}
        searchColumnId="name"
        searchPlaceholder={t("searchEmployees")}
        exportFilename="employees"
        actions={
          canCreate
            ? [{ label: t("addEmployee"), onClick: () => openForm(null), iconOnly: true, icon: Plus, variant: "primary" }]
            : []
        }
        filters={[
          {
            columnId: "department",
            title: t("department"),
            options: departments.map((d) => ({ label: d.name, value: d.id })),
          },
          {
            columnId: "role",
            title: t("accessRole"),
            options: Object.values(WorkRole).map((r) => ({ label: t(WORK_ROLE_LABEL[r]), value: r })),
          },
          {
            columnId: "status",
            title: t("status"),
            options: Object.values(EmployeeStatus).map((s) => ({ label: t(EMPLOYEE_STATUS_LABEL[s]), value: s })),
          },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        createTitle={t("addEmployee")}
        editTitle={t("editEmployee")}
        description={editing ? t("editEmployeeDescription") : t("addEmployeeDescription")}
        isSubmitting={create.isPending || update.isPending}
        onSubmit={() => formRef.current?.submit()}
      >
        <EmployeeForm
          ref={formRef}
          employee={editing ?? undefined}
          employees={employees}
          departments={departments}
          currency={workspace.currency}
          canSeeCosts={canSeeCosts}
          onValid={handleValid}
        />
      </DataTableEntityFormSheet>

      <EmployeeProfileSheet
        employee={viewing}
        employees={employees}
        departments={departments}
        currency={workspace.currency}
        canSeeCosts={canSeeCosts}
        canEditRates={canEdit && canSeeCosts}
        onOpenChange={(open) => !open && setViewing(null)}
        onSelect={setViewing}
      />

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteEmployee")}
        description={t("deleteEmployeeConfirmation", { name: deleting?.name ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
