import type { AttentionItem, HomeFigures } from "./console-home-model"

/**
 * Victor on the console home (A11 step 6): what a question is about, and the
 * answer written from the figures the home already shows. Nothing is computed
 * another way; Victor only puts the page's own numbers into a sentence.
 */

export type ConsoleTopic = "today" | "owed" | "trials" | "churn" | "mix" | "mrr" | "summary"

/** The topic of a typed question, from common words in the nine languages (the first match wins). */
export function consoleTopicOf(question: string): ConsoleTopic {
  const s = question.toLowerCase()
  if (/today|attention|urgent|aujourd|heute|hoy|اليوم|عاجل|आज|сегодня|今天|紧急/.test(s)) return "today"
  if (/owe|overdue|late|unpaid|debt|doit|dû|retard|impay|schuld|überfällig|debe|vencid|مستحق|متأخر|बकाया|долг|просроч|欠|逾期/.test(s)) return "owed"
  if (/trial|essai|testphase|prueba|تجريب|परीक्षण|пробн|试用|conver/.test(s)) return "trials"
  if (/churn|lost|cancel|perdu|résili|verlor|kündig|perdid|فقد|إلغاء|खो|отток|流失/.test(s)) return "churn"
  if (/plan|countr|pays|land|país|باقة|بلد|योजना|देश|тариф|стран|套餐|国家/.test(s)) return "mix"
  if (/mrr|arr|revenue|recurring|growth|chiffre|revenu|umsatz|ingres|إيراد|राजस्व|выручк|收入|增长/.test(s)) return "mrr"
  return "summary"
}

export type Group = { key: string; label: string; mrr: number }
export type Translate = (key: string, values?: Record<string, string | number>) => string

export interface VictorInput {
  f: HomeFigures
  attention: AttentionItem[]
  byPlan: Group[]
  byCountry: Group[]
  money: (n: number) => string
  pct: (v: number | null, digits?: number) => string
  signedPct: (v: number | null) => string
  month: (isoMonth: string) => string
  /** The comparison chosen on the page, already translated; null when none */
  compareLabel: string | null
}

/** One line per item of "needs your attention", with its reason. */
export function attentionLine(i: AttentionItem, t: Translate) {
  const why = i.kind === "overdue" ? t("chAttOverdue") : i.kind === "trial" ? t("chAttTrial", { days: i.days }) : t("chAttSupport", { number: i.number, subject: i.subject })
  return `${i.name}: ${why}`
}

export function consoleVictorAnswer(topic: ConsoleTopic, x: VictorInput, t: Translate): string {
  const { f } = x
  const share = (part: number, total: number) => x.pct(total ? part / total : null, 0)
  switch (topic) {
    case "mrr": {
      const best = [...f.window].sort((a, b) => b.change - a.change)[0]
      const values = { mrr: x.money(f.mrr), arr: x.money(f.arr), paying: f.paying, best: best ? x.month(best.month) : "—", bestAmount: best ? x.money(best.change) : "—" }
      return x.compareLabel && f.reference
        ? t("cvMrr", { ...values, change: x.signedPct(f.mrrChange), ref: x.month(f.reference.month) })
        : t("cvMrrNoCompare", values)
    }
    case "churn": {
      const sum = (k: "churn" | "contraction") => Math.abs(f.window.reduce((s, r) => s + r.movements[k], 0))
      const last = f.window[f.window.length - 1]
      return t("cvChurn", { churn: x.pct(f.churn), month: last ? x.month(last.month) : "—", lost: x.money(sum("churn")), down: x.money(sum("contraction")) })
    }
    case "trials":
      return t("cvTrials", {
        rate: x.pct(f.trials.rate, 0),
        converted: f.trials.converted,
        lost: f.trials.lost,
        running: f.trials.running,
        soon: x.attention.filter((i) => i.kind === "trial").length,
      })
    case "owed": {
      const late = x.attention.filter((i) => i.kind === "overdue").map((i) => i.name)
      return t("cvOwed", { owed: x.money(f.owed), overdue: x.money(f.overdue), n: f.overdueInvoices, names: late.length ? late.join(", ") : "—" })
    }
    case "today":
      return x.attention.length ? t("cvToday", { n: x.attention.length, list: x.attention.map((i) => attentionLine(i, t)).join(" · ") }) : t("cvTodayNone")
    case "mix": {
      const plan = x.byPlan[0]
      const country = x.byCountry[0]
      if (!plan || !country) return t("chNoRevenue")
      const total = x.byPlan.reduce((s, g) => s + g.mrr, 0)
      return t("cvMix", { plan: plan.label, planAmount: x.money(plan.mrr), planShare: share(plan.mrr, total), country: country.label, countryAmount: x.money(country.mrr), countryShare: share(country.mrr, total) })
    }
    default:
      return t("cvSummary", { mrr: x.money(f.mrr), change: x.compareLabel ? x.signedPct(f.mrrChange) : "—", churn: x.pct(f.churn), rate: x.pct(f.trials.rate, 0), owed: x.money(f.owed), n: x.attention.length })
  }
}
