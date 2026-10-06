import { createCollection } from "@/lib/workforce/demo-store"
import { recordAudit } from "@/lib/workforce/audit"
import { isComplete, reviewAction, type ReviewViewer } from "@/lib/workforce/reviews"
import { ReviewStatus, type PerformanceReview, type ReviewKpiSnapshot, type ReviewRatings } from "@/types/work-reviews"
import type { Employee } from "@/types/workforce"

function seedReviews(workspaceId: string): PerformanceReview[] {
  if (workspaceId !== "ws_atlas") return []
  const at = "2026-07-10T09:00:00.000Z"
  const base = { workspaceId, createdAt: at, updatedAt: at }
  return [
    {
      ...base,
      id: "rev_lina_h1",
      employeeId: "emp_lina",
      reviewerId: "emp_karim",
      period: "H1 2026",
      from: "2026-01-01",
      to: "2026-06-30",
      status: ReviewStatus.DONE,
      self: { ratings: { quality: 4, delivery: 4, collaboration: 5, initiative: 3, growth: 4 }, comment: "Shipped the Orbit portal on time and mentored Leo. I want to take more ownership of architecture choices.", submittedAt: "2026-07-02T10:00:00.000Z" },
      manager: {
        ratings: { quality: 5, delivery: 4, collaboration: 5, initiative: 4, growth: 4 },
        comment: "Excellent code quality and a natural mentor. Estimates are sometimes optimistic on new integrations.",
        goals: "Lead the technical design of the next client project.\nKeep estimate accuracy above 90%.",
        submittedAt: "2026-07-08T15:00:00.000Z",
      },
      kpis: { utilization: 86, onTime: 92, estimateAccuracy: 88, revenue: 61200 },
      acknowledgedAt: "2026-07-09T08:30:00.000Z",
    },
    { ...base, id: "rev_lina_h2", employeeId: "emp_lina", reviewerId: "emp_karim", period: "H2 2026", from: "2026-07-01", to: "2026-12-31", status: ReviewStatus.SELF },
    {
      ...base,
      id: "rev_julia_h2",
      employeeId: "emp_julia",
      reviewerId: "emp_sara",
      period: "H2 2026",
      from: "2026-07-01",
      to: "2026-12-31",
      status: ReviewStatus.MANAGER,
      self: { ratings: { quality: 4, delivery: 3, collaboration: 4, initiative: 4, growth: 5 }, comment: "Ran the Medica research sprint and onboarded Amina. Design reviews took longer than planned.", submittedAt: "2026-10-01T09:00:00.000Z" },
    },
    { ...base, id: "rev_noah_h2", employeeId: "emp_noah", reviewerId: "emp_karim", period: "H2 2026", from: "2026-07-01", to: "2026-12-31", status: ReviewStatus.SELF },
  ]
}

const reviews = createCollection<PerformanceReview>("reviews", "rev", seedReviews)

export async function listReviewsApi(workspaceId: string) {
  return reviews.list(workspaceId)
}

/**
 * Starts a review cycle (HR-9): one review per chosen employee, reviewed by
 * their manager, or by `fallbackReviewerId` for people without one. People who
 * already have a review for this cycle are skipped.
 */
export async function startReviewCycleApi(
  workspaceId: string,
  input: { period: string; from: string; to: string; employeeIds: string[]; fallbackReviewerId?: string },
  employees: Employee[]
) {
  const period = input.period.trim()
  if (!period) throw new Error("Name the review cycle, e.g. H2 2026")
  if (!input.from || !input.to || input.from > input.to) throw new Error("The period must start before it ends")
  if (input.employeeIds.length === 0) throw new Error("Choose at least one person")
  const existing = new Set(reviews.list(workspaceId).filter((r) => r.period.toLowerCase() === period.toLowerCase()).map((r) => r.employeeId))
  const created: PerformanceReview[] = []
  for (const id of input.employeeIds) {
    if (existing.has(id)) continue
    const person = employees.find((e) => e.id === id)
    if (!person) continue
    const reviewerId = person.managerId ?? input.fallbackReviewerId
    if (!reviewerId || reviewerId === id) continue
    created.push(reviews.create(workspaceId, { employeeId: id, reviewerId, period, from: input.from, to: input.to, status: ReviewStatus.SELF }))
  }
  recordAudit(workspaceId, { action: `Review cycle ${period} started (${created.length})`, actionKey: "reviews.start", category: "Team", target: period })
  return created
}

function load(workspaceId: string, id: string) {
  const r = reviews.get(workspaceId, id)
  if (!r) throw new Error("Review not found")
  return r
}

/** The employee's own assessment; moves the review to the reviewer. */
export async function submitSelfReviewApi(workspaceId: string, id: string, viewer: ReviewViewer, input: { ratings: ReviewRatings; comment: string }) {
  const r = load(workspaceId, id)
  if (reviewAction(r, viewer) !== "self") throw new Error("Only the employee can fill in the self-assessment")
  if (!isComplete(input.ratings)) throw new Error("Rate every criterion from 1 to 5")
  return reviews.update(workspaceId, id, {
    status: ReviewStatus.MANAGER,
    self: { ratings: input.ratings, comment: input.comment.trim(), submittedAt: new Date().toISOString() },
  })
}

/** The reviewer's assessment and goals; freezes the period's KPIs and completes the review. */
export async function submitManagerReviewApi(
  workspaceId: string,
  id: string,
  viewer: ReviewViewer,
  input: { ratings: ReviewRatings; comment: string; goals: string },
  kpis: ReviewKpiSnapshot
) {
  const r = load(workspaceId, id)
  if (reviewAction(r, viewer) !== "manager") throw new Error("Only the reviewer can complete this review")
  if (!isComplete(input.ratings)) throw new Error("Rate every criterion from 1 to 5")
  if (!input.comment.trim()) throw new Error("Add a comment for the employee")
  recordAudit(workspaceId, { action: "Performance review completed", actionKey: "reviews.complete", category: "Team", target: r.period })
  return reviews.update(workspaceId, id, {
    status: ReviewStatus.DONE,
    manager: { ratings: input.ratings, comment: input.comment.trim(), goals: input.goals.trim(), submittedAt: new Date().toISOString() },
    kpis,
  })
}

/** The employee confirms they have read the completed review. */
export async function acknowledgeReviewApi(workspaceId: string, id: string, viewer: ReviewViewer) {
  const r = load(workspaceId, id)
  if (reviewAction(r, viewer) !== "acknowledge") throw new Error("Only the employee can acknowledge their review")
  return reviews.update(workspaceId, id, { acknowledgedAt: new Date().toISOString() })
}

/** Admins can cancel a review that is not completed yet. */
export async function deleteReviewApi(workspaceId: string, id: string, viewer: ReviewViewer) {
  const r = load(workspaceId, id)
  if (!viewer.isAdmin) throw new Error("Only an admin can cancel a review")
  if (r.status === ReviewStatus.DONE) throw new Error("A completed review can't be cancelled")
  reviews.remove(workspaceId, id)
}
