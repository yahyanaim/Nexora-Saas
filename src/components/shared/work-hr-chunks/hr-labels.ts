import { ContractType, DocumentKind, type DocumentStatus } from "@/types/work-hr"

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  [DocumentKind.CONTRACT]: "docKind_contract",
  [DocumentKind.ID]: "docKind_id",
  [DocumentKind.WORK_PERMIT]: "docKind_work_permit",
  [DocumentKind.CERTIFICATE]: "docKind_certificate",
  [DocumentKind.MEDICAL]: "docKind_medical",
  [DocumentKind.OTHER]: "docKind_other",
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  [ContractType.PERMANENT]: "contract_permanent",
  [ContractType.FIXED_TERM]: "contract_fixed_term",
  [ContractType.FREELANCE]: "contract_freelance",
  [ContractType.INTERNSHIP]: "contract_internship",
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  no_expiry: "docStatus_no_expiry",
  valid: "docStatus_valid",
  expiring: "docStatus_expiring",
  expired: "docStatus_expired",
}

export const DOCUMENT_STATUS_CLASS: Record<DocumentStatus, string> = {
  no_expiry: "bg-muted text-muted-foreground border-transparent",
  valid: "bg-success-soft text-success-foreground border-transparent",
  expiring: "bg-warning-soft text-warning-foreground border-transparent",
  expired: "bg-danger-soft text-destructive border-transparent",
}

export const DOCUMENT_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
