"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  acknowledgeReviewApi,
  deleteReviewApi,
  listReviewsApi,
  startReviewCycleApi,
  submitManagerReviewApi,
  submitSelfReviewApi,
} from "@/lib/api/reviews-api"
import type { ReviewViewer } from "@/lib/workforce/reviews"
import type { ReviewKpiSnapshot, ReviewRatings } from "@/types/work-reviews"
import type { Employee } from "@/types/workforce"

export function useReviews() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["reviews", id], queryFn: () => listReviewsApi(id) })
}

export function useReviewMutations(viewer: ReviewViewer) {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const done = (key: string) => () => {
    qc.invalidateQueries({ queryKey: ["reviews", ws] })
    toast.success(t(key))
  }
  const onError = (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("somethingWentWrong"))
  return {
    start: useMutation({
      mutationFn: ({ input, employees }: { input: Parameters<typeof startReviewCycleApi>[1]; employees: Employee[] }) => startReviewCycleApi(ws, input, employees),
      onSuccess: (created) => {
        qc.invalidateQueries({ queryKey: ["reviews", ws] })
        toast.success(t("reviewCycleStarted", { count: created.length }))
      },
      onError,
    }),
    submitSelf: useMutation({
      mutationFn: ({ id, ratings, comment }: { id: string; ratings: ReviewRatings; comment: string }) => submitSelfReviewApi(ws, id, viewer, { ratings, comment }),
      onSuccess: done("reviewSelfSent"),
      onError,
    }),
    submitManager: useMutation({
      mutationFn: ({ id, input, kpis }: { id: string; input: { ratings: ReviewRatings; comment: string; goals: string }; kpis: ReviewKpiSnapshot }) =>
        submitManagerReviewApi(ws, id, viewer, input, kpis),
      onSuccess: done("reviewCompleted"),
      onError,
    }),
    acknowledge: useMutation({ mutationFn: (id: string) => acknowledgeReviewApi(ws, id, viewer), onSuccess: done("reviewAcknowledged"), onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteReviewApi(ws, id, viewer), onSuccess: done("reviewCancelled"), onError }),
  }
}
