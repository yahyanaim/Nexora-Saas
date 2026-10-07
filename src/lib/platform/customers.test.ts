import { beforeEach, describe, expect, it } from "vitest"
import { TRANSITIONS, accountMrr, accountsSummary, addDaysIso, canTransition, periodEnd } from "./customer-lifecycle"
import {
  activateCustomerApi,
  addCustomerNoteApi,
  cancelCustomerApi,
  createTrialApi,
  extendTrialApi,
  getCustomerApi,
  liftCustomerSuspensionApi,
  liftUserSuspensionApi,
  listCustomersApi,
  listDirectoryApi,
  listUserSuspensionsApi,
  sendPasswordResetApi,
  suspendCustomerApi,
  suspendUserApi,
  undoCancellationApi,
} from "@/lib/api/platform-customers-api"
import { listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { ConsoleRole as R } from "@/types/platform-console"

const owner: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const sales: ConsoleActor = { id: "stf_yassine", name: "Yassine Amrani", role: R.SALES }
const support: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }
const readOnly: ConsoleActor = { id: "stf_ro", name: "Advisor", role: R.READ_ONLY }

describe("customer lifecycle rules (Figure 2)", () => {
  it("allows only the drawn transitions", () => {
    expect(canTransition("trial", "active")).toBe(true)
    expect(canTransition("active", "trial")).toBe(false)
    expect(canTransition("payment_overdue", "cancelled")).toBe(false)
    expect(canTransition("cancelled", "active")).toBe(true)
    expect(TRANSITIONS.deleted).toEqual([])
  })

  it("counts MRR for active and payment-overdue customers only (§6.2)", () => {
    expect(accountMrr({ plan: "business", billing: "monthly", status: "active" })).toBe(1490)
    expect(accountMrr({ plan: "business", billing: "yearly", status: "payment_overdue" })).toBe(1241.67)
    expect(accountMrr({ plan: "business", billing: "monthly", status: "suspended" })).toBe(0)
    expect(accountMrr({ plan: "enterprise", billing: "monthly", status: "trial" })).toBe(0)
  })

  it("finds the end of the paid period", () => {
    expect(periodEnd({ since: "2025-03-01", billing: "monthly" }, "2026-10-08")).toBe("2026-10-31")
    expect(periodEnd({ since: "2024-11-04", billing: "yearly" }, "2026-10-08")).toBe("2026-11-03")
    expect(addDaysIso("2026-10-24", 7)).toBe("2026-10-31")
  })
})

describe("customers in the console", () => {
  beforeEach(() => localStorage.clear())

  it("seeds the catalogue with MRR and MRR at risk", async () => {
    const sum = accountsSummary(await listCustomersApi())
    expect(sum.overdue).toBe(1)
    expect(sum.atRisk).toBe(1490)
    expect(sum.trials).toBe(2)
  })

  it("creates and extends a trial once, then converts it", async () => {
    await expect(createTrialApi(support, { name: "X", city: "Rabat", country: "MA", plan: "starter", adminName: "A", adminEmail: "a@x.ma" })).rejects.toThrow(/does not allow/)
    await expect(createTrialApi(sales, { name: "Souss", city: "Agadir", country: "MA", ice: "123", plan: "business", adminName: "Amal", adminEmail: "amal@souss.ma" })).rejects.toThrow(/15 digits/)
    const trial = await createTrialApi(sales, { name: "Souss Ingénierie", city: "Agadir", country: "MA", plan: "business", adminName: "Amal", adminEmail: "amal@souss.ma" })
    expect(trial.status).toBe("trial")
    expect(trial.trialEndsOn).toBe(addDaysIso(trial.since, 14))
    await expect(createTrialApi(sales, { name: "Souss Ingénierie", city: "Agadir", country: "MA", plan: "business", adminName: "B", adminEmail: "b@souss.ma" })).rejects.toThrow(/already a customer/)
    const extended = await extendTrialApi(sales, trial.id)
    expect(extended.trialEndsOn).toBe(addDaysIso(trial.trialEndsOn!, 7))
    await expect(extendTrialApi(sales, trial.id)).rejects.toThrow(/already extended/)
    await expect(activateCustomerApi(sales, trial.id)).rejects.toThrow(/does not allow/)
    expect((await activateCustomerApi(owner, trial.id)).status).toBe("active")
    expect((await listAuditApi()).filter((e) => e.customerId === trial.id)).toHaveLength(3)
  })

  it("suspends with a reason, makes the workspace read-only and restores the previous status", async () => {
    await expect(suspendCustomerApi(owner, "cus_atlas", { reason: "no" })).rejects.toThrow(/reason/)
    const s = await suspendCustomerApi(owner, "cus_marrakech", { reason: "Unpaid for 30 days" })
    expect(s).toMatchObject({ status: "suspended", readOnly: true, suspension: { previous: "payment_overdue" } })
    const back = await liftCustomerSuspensionApi(owner, "cus_marrakech")
    expect(back).toMatchObject({ status: "payment_overdue", readOnly: false })
    await expect(activateCustomerApi(owner, "cus_marrakech")).resolves.toMatchObject({ status: "active" })
  })

  it("cancels at the end of the paid period and can undo it (CUS-09)", async () => {
    const c = await cancelCustomerApi(owner, "cus_atlas")
    expect(c.status).toBe("active")
    expect(c.cancelsOn).toBeTruthy()
    await expect(cancelCustomerApi(owner, "cus_atlas")).rejects.toThrow(/already planned/)
    expect((await undoCancellationApi(owner, "cus_atlas")).cancelsOn).toBeUndefined()
    await expect(cancelCustomerApi(owner, "cus_marrakech")).rejects.toThrow(/not allowed/)
  })

  it("keeps notes for the team and refuses read-only members", async () => {
    await expect(addCustomerNoteApi(readOnly, "cus_atlas", "hello")).rejects.toThrow(/does not allow/)
    const c = await addCustomerNoteApi(support, "cus_atlas", "Asked about yearly billing")
    expect(c.notes[0]).toMatchObject({ text: "Asked about yearly billing", author: "Liam O'Connor" })
    expect((await getCustomerApi("cus_atlas"))!.notes).toHaveLength(1)
  })
})

describe("platform user directory (§5.7)", () => {
  beforeEach(() => localStorage.clear())

  it("lists company people only, with the seeded suspension", async () => {
    const people = await listDirectoryApi()
    expect(people.some((u) => u.email.endsWith("@nexora.io"))).toBe(false)
    expect(people.find((u) => u.email === "spam.bot@mailinator.com")?.status).toBe("suspended")
  })

  it("never leaves a company without its administrator (USR-05)", async () => {
    const admin = (await listDirectoryApi()).find((u) => u.email === "alex.morgan@company.io")!
    await expect(suspendUserApi(owner, admin, { reason: "Shared credentials" })).rejects.toThrow(/no administrator/)
    await suspendCustomerApi(owner, "cus_atlas", { reason: "Security review" })
    await expect(suspendUserApi(owner, admin, { reason: "Shared credentials" })).resolves.toMatchObject({ name: "Alex Morgan" })
  })

  it("suspends and lifts a member, and records password resets", async () => {
    const member = (await listDirectoryApi()).find((u) => u.email === "karim@atlas.ma")!
    await expect(suspendUserApi(support, member, { reason: "Phishing attempt" })).rejects.toThrow(/does not allow/)
    const s = await suspendUserApi(owner, member, { reason: "Phishing attempt" })
    expect((await listDirectoryApi()).find((u) => u.id === member.id)?.status).toBe("suspended")
    await liftUserSuspensionApi(owner, s.id)
    expect((await listUserSuspensionsApi()).some((x) => x.id === s.id)).toBe(false)
    await sendPasswordResetApi(support, member)
    expect((await listAuditApi())[0]).toMatchObject({ action: "user.password_reset", actorName: "Liam O'Connor" })
  })
})
