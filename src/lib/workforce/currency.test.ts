import { describe, it, expect } from "vitest"
import { CURRENCIES, currencyAfterCountryChange, defaultCurrencyFor } from "./currency"

describe("currencies", () => {
  it("offers MAD first and uses it for Moroccan companies", () => {
    expect(CURRENCIES[0]).toBe("MAD")
    expect(defaultCurrencyFor("MA")).toBe("MAD")
    expect(defaultCurrencyFor("FR")).toBe("EUR")
    expect(defaultCurrencyFor(undefined)).toBe("MAD")
  })

  it("follows the new country unless a currency was picked on purpose", () => {
    expect(currencyAfterCountryChange("EUR", "FR", "MA")).toBe("MAD")
    expect(currencyAfterCountryChange("MAD", "MA", "US")).toBe("USD")
    expect(currencyAfterCountryChange("EUR", "MA", "US")).toBe("EUR")
  })
})
