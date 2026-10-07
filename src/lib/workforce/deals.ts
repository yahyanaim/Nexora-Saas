import { DealStage, OPEN_STAGES, type Deal, type DealInput } from "@/types/work-sales"
import { roundMoney } from "./money"

/** Default chance of winning at each stage, in percent. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  [DealStage.LEAD]: 10,
  [DealStage.QUALIFIED]: 25,
  [DealStage.PROPOSAL]: 50,
  [DealStage.NEGOTIATION]: 75,
  [DealStage.WON]: 100,
  [DealStage.LOST]: 0,
}

export const isOpenDeal = (d: Pick<Deal, "stage">) => (OPEN_STAGES as readonly DealStage[]).includes(d.stage)

/** Won and lost deals are certain; open ones use their own chance or the stage default. */
export function dealProbability(d: Pick<Deal, "stage" | "probability">): number {
  if (!isOpenDeal(d)) return STAGE_PROBABILITY[d.stage]
  return d.probability ?? STAGE_PROBABILITY[d.stage]
}

export const weightedValue = (d: Pick<Deal, "stage" | "probability" | "amount">) => roundMoney((d.amount * dealProbability(d)) / 100)

export interface StageSummary {
  stage: DealStage
  count: number
  amount: number
  weighted: number
}

export function pipelineByStage(deals: Deal[]): StageSummary[] {
  return Object.values(DealStage).map((stage) => {
    const rows = deals.filter((d) => d.stage === stage)
    return {
      stage,
      count: rows.length,
      amount: roundMoney(rows.reduce((s, d) => s + d.amount, 0)),
      weighted: roundMoney(rows.reduce((s, d) => s + weightedValue(d), 0)),
    }
  })
}

/** Open pipeline totals, win rate on closed deals and open deals past their expected close date. */
export function pipelineSummary(deals: Deal[], today: string) {
  const open = deals.filter(isOpenDeal)
  const won = deals.filter((d) => d.stage === DealStage.WON)
  const lost = deals.filter((d) => d.stage === DealStage.LOST)
  const closed = won.length + lost.length
  return {
    openCount: open.length,
    openAmount: roundMoney(open.reduce((s, d) => s + d.amount, 0)),
    weighted: roundMoney(open.reduce((s, d) => s + weightedValue(d), 0)),
    wonAmount: roundMoney(won.reduce((s, d) => s + d.amount, 0)),
    winRate: closed ? Math.round((won.length / closed) * 100) : null,
    overdue: open.filter((d) => d.expectedClose < today),
  }
}

/** Throws the first problem with a deal. */
export function assertDeal(input: DealInput) {
  if (!input.title?.trim()) throw new Error("Give the deal a name")
  if (!input.clientId) throw new Error("Choose a client")
  if (!(input.amount >= 0)) throw new Error("The amount can't be negative")
  if (!input.expectedClose) throw new Error("Set the expected close date")
  if (input.probability !== undefined && !(input.probability >= 0 && input.probability <= 100)) throw new Error("The chance of winning must be between 0 and 100%")
  if (input.stage === DealStage.LOST && !input.lostReason?.trim()) throw new Error("Say why the deal was lost")
}
