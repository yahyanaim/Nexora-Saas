import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"

/** Console configuration (cahier des charges §5.13, Lot A5). */

/** CFG-04: Nexora's legal identity and bank details, printed on its invoices. */
export interface NexoraIdentity {
  id: string
  workspaceId: string
  legalName: string
  address: string
  city: string
  country: string
  ice: string
  /** Identifiant fiscal */
  taxId: string
  rc: string
  email: string
  phone: string
  bankName: string
  /** 24-digit Moroccan RIB */
  rib: string
  swift: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

/** What each invoice keeps of the identity at its issue, so later edits only reach new invoices. */
export type SellerSnapshot = Pick<NexoraIdentity, "legalName" | "address" | "city" | "country" | "ice" | "taxId" | "rc" | "bankName" | "rib" | "swift">

/** CFG-01: a message to every customer or a segment, between two dates. */
export interface Announcement {
  id: string
  workspaceId: string
  title: string
  message: string
  /** Empty means every plan / every country */
  plans: NexoraPlanId[]
  countries: string[]
  /** yyyy-mm-dd, inclusive */
  from: string
  to: string
  createdBy: string
  endedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * CFG-02: a feature released gradually. Engineers define the flags in code;
 * the console decides who gets them: when on, every customer unless plans or
 * customers are listed, then only those.
 */
export interface FeatureFlag {
  id: string
  workspaceId: string
  key: string
  enabled: boolean
  plans: NexoraPlanId[]
  customerIds: string[]
  updatedBy: string
  createdAt: string
  updatedAt: string
}
