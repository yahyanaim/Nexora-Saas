import { EmployeeStatus, WorkRole, type Employee } from "@/types/workforce"
import { AMOUNT_SUBJECTS, ApprovalMode, type ApprovalRule, type ApprovalSubject } from "@/types/work-settings"

const canAct = (e: Employee | undefined): e is Employee => !!e && e.status !== EmployeeStatus.INACTIVE

/**
 * Who approves a request from `submitterId` (BR-3): the direct manager, else
 * the next manager up the chain, else an active Admin. Never the submitter.
 */
export function resolveApprover(submitterId: string, employees: Employee[]): Employee | undefined {
  const byId = new Map(employees.map((e) => [e.id, e]))
  const seen = new Set<string>([submitterId])
  let current = byId.get(submitterId)
  while (current?.managerId && !seen.has(current.managerId)) {
    seen.add(current.managerId)
    const manager = byId.get(current.managerId)
    if (canAct(manager)) return manager
    current = manager
  }
  return employees.find((e) => e.id !== submitterId && e.role === WorkRole.ADMIN && canAct(e))
}

/** BR-3: a person never approves their own timesheet, expense or leave. */
export function assertNotSelfApproval(approverId: string | undefined, submitterId: string) {
  if (approverId && approverId === submitterId) throw new Error("You can't approve your own request")
}

/** How many approval steps a request needs under the workspace rules. */
export function stepsRequired(rules: ApprovalRule[], subject: ApprovalSubject, amount = 0): 0 | 1 | 2 {
  const rule = rules.find((r) => r.subject === subject)
  if (!rule || rule.mode === ApprovalMode.NONE) return 0
  if (rule.mode === ApprovalMode.ONE_STEP) return 1
  if (AMOUNT_SUBJECTS.includes(subject) && rule.secondStepAbove !== undefined) {
    return amount > rule.secondStepAbove ? 2 : 1
  }
  return 2
}
