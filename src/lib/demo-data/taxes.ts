// lib/demo-data/taxes.ts
import { TaxRate, MoroccanFiscalConfig, TaxCalculationResult } from "@/types/taxes"

const TAX_STORAGE_KEY = "nexora_moroccan_tax_rates"
const FISCAL_STORAGE_KEY = "nexora_moroccan_fiscal_config"

export const INITIAL_MOROCCAN_TAX_RATES: TaxRate[] = [
  {
    id: "tax-tva-20",
    name: "TVA Normale (Prestations SaaS & Services IT)",
    code: "TVA_20",
    rate: 20,
    type: "percentage",
    isDefault: true,
    isMoroccanTva: true,
    category: "standard",
    description: "Taux standard légal de 20% applicable aux abonnements logiciels, services Cloud et prestations informatiques au Maroc.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "tax-tva-14",
    name: "TVA Intermédiaire (Télécom & Réseaux)",
    code: "TVA_14",
    rate: 14,
    type: "percentage",
    isDefault: false,
    isMoroccanTva: true,
    category: "intermediate",
    description: "Taux réduit de 14% applicable aux prestations de transport et opérations télécoms d'entreprise.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "tax-tva-10",
    name: "TVA Réduite (Services Financiers & Opérations)",
    code: "TVA_10",
    rate: 10,
    type: "percentage",
    isDefault: false,
    isMoroccanTva: true,
    category: "reduced",
    description: "Taux de 10% applicable aux prestations financières, transactions de change et commissions bancaires.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "tax-tva-7",
    name: "TVA Première Nécessité (Consommation de Base)",
    code: "TVA_7",
    rate: 7,
    type: "percentage",
    isDefault: false,
    isMoroccanTva: true,
    category: "reduced",
    description: "Taux de 7% applicable aux produits essentiels et fournitures scolaires au Maroc.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "tax-tva-0",
    name: "TVA Exonérée (Export de Services / Offshoring)",
    code: "TVA_0",
    rate: 0,
    type: "percentage",
    isDefault: false,
    isMoroccanTva: true,
    category: "zero",
    description: "Exonération avec droit à déduction (Article 92-I-1° du CGI) pour exportations de services et zones d'accélération industrielle.",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

export const INITIAL_MOROCCAN_FISCAL_CONFIG: MoroccanFiscalConfig = {
  companyName: "Nexora Technologies SARL AU",
  ice: "002847192000084",
  ifNumber: "40182934",
  rcNumber: "Casablanca 148291",
  patente: "34192084",
  cnss: "8912345",
  address: "Casablanca Finance City, Tour CFC, 14ème Étage",
  city: "Casablanca",
  country: "Maroc",
  defaultCurrency: "MAD",
}

let inMemoryTaxRates: TaxRate[] = [...INITIAL_MOROCCAN_TAX_RATES]
let inMemoryFiscalConfig: MoroccanFiscalConfig = { ...INITIAL_MOROCCAN_FISCAL_CONFIG }

export function getTaxRates(): TaxRate[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(TAX_STORAGE_KEY)
      if (stored) {
        inMemoryTaxRates = JSON.parse(stored)
      }
    } catch (e) {
      console.warn("Could not read tax rates from localStorage", e)
    }
  }
  return inMemoryTaxRates
}

export function saveTaxRates(rates: TaxRate[]): void {
  inMemoryTaxRates = rates
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(rates))
      window.dispatchEvent(new Event("nexora_taxes_updated"))
    } catch (e) {
      console.warn("Could not write tax rates to localStorage", e)
    }
  }
}

export function getDefaultTaxRate(): TaxRate {
  const rates = getTaxRates()
  const found = rates.find((r) => r.isDefault)
  if (found) return found
  const first = rates[0]
  if (first) return first
  return INITIAL_MOROCCAN_TAX_RATES[0] as TaxRate
}

export function addTaxRate(payload: Omit<TaxRate, "id" | "createdAt" | "updatedAt">): TaxRate {
  const rates = getTaxRates()
  const newRate: TaxRate = {
    ...payload,
    id: `tax-custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  let updatedRates = [...rates]
  if (newRate.isDefault) {
    updatedRates = updatedRates.map((r) => ({ ...r, isDefault: false }))
  }
  updatedRates.push(newRate)
  saveTaxRates(updatedRates)
  return newRate
}

export function updateTaxRate(id: string, payload: Partial<TaxRate>): TaxRate | null {
  const rates = getTaxRates()
  const index = rates.findIndex((r) => r.id === id)
  if (index === -1) return null

  const existing = rates[index]
  if (!existing) return null

  let updatedRates = [...rates]
  if (payload.isDefault) {
    updatedRates = updatedRates.map((r) => ({ ...r, isDefault: false }))
  }

  const updatedItem: TaxRate = {
    ...existing,
    ...payload,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  }

  updatedRates[index] = updatedItem
  saveTaxRates(updatedRates)
  return updatedItem
}

export function deleteTaxRate(id: string): boolean {
  const rates = getTaxRates()
  const filtered = rates.filter((r) => r.id !== id)
  if (filtered.length === rates.length) return false
  if (filtered.length > 0 && !filtered.some((r) => r.isDefault)) {
    const first = filtered[0]
    if (first) {
      first.isDefault = true
    }
  }
  saveTaxRates(filtered)
  return true
}

export function getMoroccanFiscalConfig(): MoroccanFiscalConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(FISCAL_STORAGE_KEY)
      if (stored) {
        inMemoryFiscalConfig = JSON.parse(stored)
      }
    } catch (e) {
      console.warn("Could not read fiscal config from localStorage", e)
    }
  }
  return inMemoryFiscalConfig
}

export function updateMoroccanFiscalConfig(payload: Partial<MoroccanFiscalConfig>): MoroccanFiscalConfig {
  inMemoryFiscalConfig = {
    ...inMemoryFiscalConfig,
    ...payload,
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FISCAL_STORAGE_KEY, JSON.stringify(inMemoryFiscalConfig))
      window.dispatchEvent(new Event("nexora_fiscal_updated"))
    } catch (e) {
      console.warn("Could not write fiscal config to localStorage", e)
    }
  }
  return inMemoryFiscalConfig
}

export function calculateMoroccanTax(subtotalHt: number, taxRateId?: string): TaxCalculationResult {
  const rates = getTaxRates()
  const taxRate = taxRateId ? rates.find((r) => r.id === taxRateId) || getDefaultTaxRate() : getDefaultTaxRate()

  let taxAmount = 0
  if (taxRate.type === "percentage") {
    taxAmount = Number(((subtotalHt * taxRate.rate) / 100).toFixed(2))
  } else {
    taxAmount = taxRate.rate
  }

  const totalTtc = Number((subtotalHt + taxAmount).toFixed(2))

  return {
    subtotalHt,
    taxRate,
    taxAmount,
    totalTtc,
  }
}
