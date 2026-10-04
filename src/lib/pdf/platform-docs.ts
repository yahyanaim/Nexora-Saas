import { getMoroccanFiscalConfig } from "@/lib/demo-data/taxes"
import { clean, DEFAULT_BRAND, loadLogo } from "./pdf-kit"
import type { InvoiceDocument } from "./invoice-template"

/**
 * Identity of the platform operator (the company selling Nexora subscriptions),
 * shared by subscription invoices and payment receipts.
 */
export async function platformSeller() {
  const fiscal = getMoroccanFiscalConfig()
  return {
    brand: DEFAULT_BRAND,
    logo: await loadLogo("/app-logo.png"),
    seller: {
      name: fiscal.companyName,
      lines: [
        [fiscal.address, fiscal.city, fiscal.country].filter(Boolean).join(", "),
        [`ICE ${fiscal.ice}`, `IF ${fiscal.ifNumber}`, `RC ${fiscal.rcNumber}`].join("  ·  "),
        [fiscal.patente && `TP ${fiscal.patente}`, fiscal.cnss && `CNSS ${fiscal.cnss}`].filter(Boolean).join("  ·  "),
      ].filter(Boolean),
    },
    legal: clean(`${fiscal.companyName}  ·  ${fiscal.address}, ${fiscal.city}  ·  ICE ${fiscal.ice}  ·  IF ${fiscal.ifNumber}  ·  RC ${fiscal.rcNumber}`),
  }
}

/** Opens a generated PDF in a new tab and starts printing, so print and download look the same. */
export function printPdf(doc: { output: (type: "bloburl") => URL | string }) {
  const url = String(doc.output("bloburl"))
  const win = window.open(url, "_blank")
  if (!win) return
  win.addEventListener("load", () => setTimeout(() => win.print(), 300))
}

export type PlatformDoc = Pick<InvoiceDocument, "brand" | "logo" | "seller">
