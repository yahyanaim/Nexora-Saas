"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterGradient } from "@/components/ui/footer-gradient"
import { usePlans } from "@/hooks/plans/use-plans"
import { useQuery } from "@tanstack/react-query"
import { fetchPlansApi } from "@/lib/api/plans-apis"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlanCard, PlanCardData } from "./plan-card"
import { PlanForm } from "./plan-form"
import { useTranslations } from "next-intl"

export default function PlansPage() {
  const t = useTranslations()
  const {
    createPlan,
    updatePlan,
    deletePlan,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePlans()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["plans-list"],
    queryFn: () =>
      fetchPlansApi({
        page: 0,
        pageSize: 100,
      }),
  })

  const plans = data?.data || []

  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanCardData | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<PlanCardData | null>(null)

  const handleCreate = () => {
    setEditingPlan(null)
    setFormOpen(true)
  }

  const handleEdit = (plan: PlanCardData) => {
    setEditingPlan(plan)
    setFormOpen(true)
  }

  const handleDeleteClick = (plan: PlanCardData) => {
    setPlanToDelete(plan)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (planToDelete) {
      deletePlan(planToDelete.id, {
        onSuccess: () => {
          refetch()
          setDeleteDialogOpen(false)
          setPlanToDelete(null)
        },
      })
    }
  }

  const handleSubmit = (data: Omit<PlanCardData, "id"> & { id?: string }) => {
    if (editingPlan) {
      updatePlan(
        { id: editingPlan.id, payload: data },
        {
          onSuccess: () => {
            refetch()
            setFormOpen(false)
          },
        }
      )
    } else {
      createPlan(data, {
        onSuccess: () => {
          refetch()
          setFormOpen(false)
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full w-full space-y-6 overflow-auto p-4 pb-24 md:p-6 md:pb-28">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("plans")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("plansDescription")}
            </p>
          </div>
          <Button className="px-5" variant="primary" onClick={handleCreate}>
            {t("createPlan")}
            <Plus className="size-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isDeleting={isDeleting && planToDelete?.id === plan.id}
            />
          ))}
        </div>
      </div>

      <FooterGradient position="absolute" height="lg" blur={false} />

      <PlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editingPlan}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePlan")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePlanConfirmation", { name: planToDelete?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={isDeleting}
              variant={"destructive"}
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1"
              variant={"red"}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("deleting") : t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
