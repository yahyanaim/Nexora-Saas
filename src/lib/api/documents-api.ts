import { ContractType, DocumentKind, type EmployeeDocument, type EmployeeDocumentInput } from "@/types/work-hr"
import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { documentProblem } from "@/lib/workforce/documents"
import { recordAudit } from "@/lib/workforce/audit"
import { listEmployeesApi } from "./employees-api"

const STAMP = "2026-01-05T09:00:00.000Z"

/** Sample HR files: contracts for everyone plus a few dates that need attention. */
function seedDocuments(workspaceId: string): EmployeeDocument[] {
  const today = todayIso()
  const permanent = (id: string, employeeId: string, startDate: string) => ({ id, employeeId, kind: DocumentKind.CONTRACT, title: "Employment contract", contractType: ContractType.PERMANENT, startDate, fileName: "contract.pdf" })
  const rows: Omit<EmployeeDocument, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          permanent("doc_1", "emp_sara", "2019-03-01"),
          permanent("doc_2", "emp_karim", "2020-06-15"),
          permanent("doc_3", "emp_lina", "2021-02-01"),
          permanent("doc_4", "emp_omar", "2022-09-12"),
          permanent("doc_5", "emp_julia", "2021-11-08"),
          permanent("doc_6", "emp_yassine", "2020-01-20"),
          permanent("doc_7", "emp_emma", "2023-04-03"),
          { id: "doc_8", employeeId: "emp_noah", kind: DocumentKind.CONTRACT, title: "Freelance agreement", contractType: ContractType.FREELANCE, startDate: "2025-07-01", expiryDate: addDays(today, 21), fileName: "freelance-agreement.pdf", notes: "Renew or replace before the end date" },
          { id: "doc_9", employeeId: "emp_amina", kind: DocumentKind.CONTRACT, title: "Part-time contract", contractType: ContractType.FIXED_TERM, startDate: "2024-10-14", expiryDate: addDays(today, 75), fileName: "part-time-contract.pdf" },
          { id: "doc_10", employeeId: "emp_omar", kind: DocumentKind.WORK_PERMIT, title: "Work permit", startDate: addDays(today, -730), expiryDate: addDays(today, -4), fileName: "work-permit.pdf", notes: "Renewal requested at the prefecture" },
          { id: "doc_11", employeeId: "emp_lina", kind: DocumentKind.CERTIFICATE, title: "AWS Solutions Architect", startDate: addDays(today, -1060), expiryDate: addDays(today, 35), fileName: "aws-certificate.pdf" },
          { id: "doc_12", employeeId: "emp_karim", kind: DocumentKind.MEDICAL, title: "Occupational health check", startDate: addDays(today, -340), expiryDate: addDays(today, 25) },
          { id: "doc_13", employeeId: "emp_sara", kind: DocumentKind.ID, title: "National ID card", expiryDate: addDays(today, 1500), fileName: "cin.pdf" },
        ]
      : workspaceId === "ws_northwind"
        ? [
            permanent("doc_20", "emp_ava", "2018-05-01"),
            permanent("doc_21", "emp_mateo", "2020-08-17"),
            permanent("doc_22", "emp_chloe", "2022-03-28"),
            { id: "doc_23", employeeId: "emp_ethan", kind: DocumentKind.CONTRACT, title: "Part-time contract", contractType: ContractType.FIXED_TERM, startDate: "2023-01-09", expiryDate: addDays(today, 12), fileName: "contract-ethan.pdf" },
          ]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Employee documents and contracts. Backed by the browser demo store for now;
 * replace the bodies with apiClient calls (and a file upload) once the backend exists.
 */
const documents = createCollection<EmployeeDocument>("documents", "doc", seedDocuments)

const clean = (input: EmployeeDocumentInput): EmployeeDocumentInput => ({
  ...input,
  title: input.title.trim(),
  contractType: input.kind === DocumentKind.CONTRACT ? input.contractType : undefined,
  startDate: input.startDate || undefined,
  expiryDate: input.expiryDate || undefined,
  fileName: input.fileName || undefined,
  notes: input.notes?.trim() || undefined,
})

async function validate(workspaceId: string, input: EmployeeDocumentInput) {
  const problem = documentProblem(input)
  if (problem) throw new Error(problem)
  if (!(await listEmployeesApi(workspaceId)).some((e) => e.id === input.employeeId)) throw new Error("Employee not found")
}

export async function listDocumentsApi(workspaceId: string): Promise<EmployeeDocument[]> {
  return documents.list(workspaceId).sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"))
}

export async function createDocumentApi(workspaceId: string, input: EmployeeDocumentInput): Promise<EmployeeDocument> {
  const data = clean(input)
  await validate(workspaceId, data)
  const created = documents.create(workspaceId, data)
  recordAudit(workspaceId, { action: "Document added", actionKey: "document.created", category: "Team", target: `${data.title} (${data.employeeId})` })
  return created
}

export async function updateDocumentApi(workspaceId: string, id: string, input: EmployeeDocumentInput): Promise<EmployeeDocument> {
  const before = documents.get(workspaceId, id)
  if (!before) throw new Error("Document not found")
  const data = clean(input)
  await validate(workspaceId, data)
  recordAudit(workspaceId, { action: "Document updated", actionKey: "document.updated", category: "Team", target: data.title, before: before.expiryDate ?? "—", after: data.expiryDate ?? "—" })
  return documents.update(workspaceId, id, data)
}

export async function deleteDocumentApi(workspaceId: string, id: string): Promise<void> {
  const before = documents.get(workspaceId, id)
  if (!before) throw new Error("Document not found")
  recordAudit(workspaceId, { action: "Document deleted", actionKey: "document.deleted", category: "Team", target: before.title })
  documents.remove(workspaceId, id)
}
