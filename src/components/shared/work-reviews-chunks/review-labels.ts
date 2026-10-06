import { ReviewStatus } from "@/types/work-reviews"

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  [ReviewStatus.SELF]: "reviewStatus_self",
  [ReviewStatus.MANAGER]: "reviewStatus_manager",
  [ReviewStatus.DONE]: "reviewStatus_done",
}

export const REVIEW_STATUS_CLASS: Record<ReviewStatus, string> = {
  [ReviewStatus.SELF]: "bg-info-soft text-info-foreground border-transparent",
  [ReviewStatus.MANAGER]: "bg-warning-soft text-warning-foreground border-transparent",
  [ReviewStatus.DONE]: "bg-success-soft text-success-foreground border-transparent",
}
