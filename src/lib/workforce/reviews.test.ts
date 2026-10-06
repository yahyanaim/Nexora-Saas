import { describe, it, expect } from "vitest"
import { averageRating, canSeeReview, isComplete, reviewAction } from "./reviews"
import {
  acknowledgeReviewApi,
  deleteReviewApi,
  listReviewsApi,
  startReviewCycleApi,
  submitManagerReviewApi,
  submitSelfReviewApi,
} from "@/lib/api/reviews-api"
import { ReviewStatus, type PerformanceReview } from "@/types/work-reviews"
import type { Employee } from "@/types/workforce"

const team = [{ id: "boss" }, { id: "lead", managerId: "boss" }, { id: "dev", managerId: "lead" }, { id: "peer", managerId: "lead" }]
const review = (o: Partial<PerformanceReview> = {}) =>
  ({ id: "r", employeeId: "dev", reviewerId: "lead", period: "H2", from: "2026-07-01", to: "2026-12-31", status: ReviewStatus.SELF, ...o }) as PerformanceReview
const all5 = { quality: 5, delivery: 4, collaboration: 4, initiative: 3, growth: 4 }
const kpis = { utilization: 80, onTime: 90, estimateAccuracy: null, revenue: 1000 }

describe("review rules", () => {
  it("averages and checks ratings", () => {
    expect(averageRating(all5)).toBe(4)
    expect(averageRating({})).toBeNull()
    expect(isComplete(all5)).toBe(true)
    expect(isComplete({ ...all5, growth: 6 })).toBe(false)
    expect(isComplete({ quality: 3 })).toBe(false)
  })
  it("limits who sees a review to the employee, reviewer, line above and admins", () => {
    expect(canSeeReview(review(), { employeeId: "dev", isAdmin: false }, team)).toBe(true)
    expect(canSeeReview(review(), { employeeId: "lead", isAdmin: false }, team)).toBe(true)
    expect(canSeeReview(review(), { employeeId: "boss", isAdmin: false }, team)).toBe(true)
    expect(canSeeReview(review(), { employeeId: "peer", isAdmin: false }, team)).toBe(false)
    expect(canSeeReview(review(), { isAdmin: true }, team)).toBe(true)
  })
  it("gives each step to the right person", () => {
    expect(reviewAction(review(), { employeeId: "dev", isAdmin: false })).toBe("self")
    expect(reviewAction(review(), { employeeId: "lead", isAdmin: false })).toBeNull()
    expect(reviewAction(review({ status: ReviewStatus.MANAGER }), { employeeId: "lead", isAdmin: false })).toBe("manager")
    expect(reviewAction(review({ status: ReviewStatus.MANAGER }), { employeeId: "dev", isAdmin: true })).toBeNull()
    expect(reviewAction(review({ status: ReviewStatus.DONE }), { employeeId: "dev", isAdmin: false })).toBe("acknowledge")
    expect(reviewAction(review({ status: ReviewStatus.DONE, acknowledgedAt: "x" }), { employeeId: "dev", isAdmin: false })).toBeNull()
  })
})

describe("review cycle", () => {
  const ws = "ws_test_reviews"
  const people = [
    { id: "boss", name: "Boss", status: "active" },
    { id: "dev", name: "Dev", managerId: "boss", status: "active" },
  ] as Employee[]
  it("runs from start to acknowledgement", async () => {
    await expect(startReviewCycleApi(ws, { period: " ", from: "2026-07-01", to: "2026-12-31", employeeIds: ["dev"] }, people)).rejects.toThrow(/Name/)
    const created = await startReviewCycleApi(ws, { period: "H2 2026", from: "2026-07-01", to: "2026-12-31", employeeIds: ["dev", "boss"] }, people)
    // The boss has no manager and no fallback reviewer, so only Dev gets a review
    expect(created.map((r) => r.employeeId)).toEqual(["dev"])
    expect(await startReviewCycleApi(ws, { period: "h2 2026", from: "2026-07-01", to: "2026-12-31", employeeIds: ["dev"] }, people)).toEqual([])
    const id = created[0]!.id
    const dev = { employeeId: "dev", isAdmin: false }
    const boss = { employeeId: "boss", isAdmin: false }
    await expect(submitSelfReviewApi(ws, id, boss, { ratings: all5, comment: "" })).rejects.toThrow(/employee/)
    await expect(submitSelfReviewApi(ws, id, dev, { ratings: { quality: 4 }, comment: "" })).rejects.toThrow(/every criterion/)
    expect((await submitSelfReviewApi(ws, id, dev, { ratings: all5, comment: "Good half" })).status).toBe(ReviewStatus.MANAGER)
    await expect(submitManagerReviewApi(ws, id, boss, { ratings: all5, comment: " ", goals: "" }, kpis)).rejects.toThrow(/comment/)
    const done = await submitManagerReviewApi(ws, id, boss, { ratings: all5, comment: "Well done", goals: "Lead a project" }, kpis)
    expect(done.status).toBe(ReviewStatus.DONE)
    expect(done.kpis).toEqual(kpis)
    await expect(deleteReviewApi(ws, id, { isAdmin: true })).rejects.toThrow(/completed/)
    expect((await acknowledgeReviewApi(ws, id, dev)).acknowledgedAt).toBeTruthy()
    expect((await listReviewsApi(ws)).length).toBe(1)
  })
})
