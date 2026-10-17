import type { Client } from "@/types/workforce"

/** Longest mailto: link most e-mail apps open reliably. */
export const MAILTO_LIMIT = 1800

/** One address per client: its main contact's, else the client's own; no blanks, no duplicates. */
export function clientRecipients(clients: Pick<Client, "email" | "contacts">[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of clients) {
    const address = (c.contacts.find((x) => x.isPrimary)?.email || c.email || "").trim()
    if (!address || seen.has(address.toLowerCase())) continue
    seen.add(address.toLowerCase())
    out.push(address)
  }
  return out
}

/**
 * A link opening the e-mail app with everyone in BCC, so clients don't see
 * each other; null when the list is too long for one link (copy it instead).
 */
export function bccMailto(addresses: string[]) {
  if (!addresses.length) return null
  const href = `mailto:?bcc=${addresses.map(encodeURIComponent).join(",")}`
  return href.length > MAILTO_LIMIT ? null : href
}
