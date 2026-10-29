// lib/demo-data/taxes.ts
import { MoroccanFiscalConfig } from "@/types/taxes"
import { logger } from "@/lib/logger"

const FISCAL_STORAGE_KEY = "nexora_moroccan_fiscal_config"

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

let inMemoryFiscalConfig: MoroccanFiscalConfig = { ...INITIAL_MOROCCAN_FISCAL_CONFIG }

export function getMoroccanFiscalConfig(): MoroccanFiscalConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(FISCAL_STORAGE_KEY)
      if (stored) {
        inMemoryFiscalConfig = JSON.parse(stored)
      }
    } catch (e) {
      logger.warn("Could not read fiscal config from localStorage", e)
    }
  }
  return inMemoryFiscalConfig
}
