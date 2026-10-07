/** Sales pipeline: deals followed from first contact to signature (Phase 6g.2). */

export enum DealStage {
  LEAD = "lead",
  QUALIFIED = "qualified",
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  WON = "won",
  LOST = "lost",
}

export const OPEN_STAGES = [DealStage.LEAD, DealStage.QUALIFIED, DealStage.PROPOSAL, DealStage.NEGOTIATION] as const

export interface Deal {
  id: string
  workspaceId: string
  title: string
  clientId: string
  /** Expected value, before VAT, in the workspace currency */
  amount: number
  stage: DealStage
  /** Chance of winning in percent; the stage default applies when unset */
  probability?: number
  /** yyyy-mm-dd */
  expectedClose: string
  /** Employee who follows the deal */
  ownerId?: string
  /** Quote sent for this deal */
  quoteId?: string
  lostReason?: string
  note?: string
  /** yyyy-mm-dd, set when the deal is won or lost */
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export type DealInput = Pick<Deal, "title" | "clientId" | "amount" | "stage" | "expectedClose"> &
  Partial<Pick<Deal, "probability" | "ownerId" | "quoteId" | "lostReason" | "note">>
