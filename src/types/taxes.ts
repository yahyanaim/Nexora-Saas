// types/taxes.ts

export interface TaxRate {
  id: string
  name: string
  code: string
  rate: number // percentage e.g. 20 for 20%
  type: "percentage" | "fixed"
  isDefault?: boolean
  isMoroccanTva?: boolean
  description: string
  category: "standard" | "reduced" | "intermediate" | "zero" | "custom"
  createdAt?: string
  updatedAt?: string
}

export interface MoroccanFiscalConfig {
  companyName: string
  ice: string // Identifiant Commun de l'Entreprise (15 digits)
  ifNumber: string // Identifiant Fiscal (8 digits)
  rcNumber: string // Registre du Commerce
  patente: string // Taxe Professionnelle / Patente
  cnss?: string // Caisse Nationale de Sécurité Sociale
  address: string
  city: string
  country: string
  defaultCurrency: string
}

export interface TaxCalculationResult {
  subtotalHt: number
  taxRate: TaxRate
  taxAmount: number
  totalTtc: number
}
