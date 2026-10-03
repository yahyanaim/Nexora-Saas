import { test, expect, type Page } from "@playwright/test"

/** Collects Content-Security-Policy violations reported by the page. */
async function trackCspViolations(page: Page) {
  const violations: string[] = []
  await page.exposeFunction("__reportCsp", (v: string) => violations.push(v))
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(
        `${e.violatedDirective} ${e.blockedURI}`
      )
    )
  })
  return violations
}

test("auth pages render under the CSP without violations", async ({ page }) => {
  const violations = await trackCspViolations(page)
  for (const path of ["/en/auth", "/ar/auth"]) {
    const res = await page.goto(path, { waitUntil: "networkidle" })
    expect(res?.headers()["content-security-policy"]).toContain("'strict-dynamic'")
    await expect(page.locator('input[type="password"]')).toBeVisible()
  }
  expect(violations).toEqual([])
})

test("protected routes redirect guests to login with a next parameter", async ({ page }) => {
  await page.goto("/en/dashboard/users?page=2")
  await expect(page).toHaveURL(/\/en\/auth\?next=%2Fdashboard%2Fusers%3Fpage%3D2$/)
})

test("login through the same-origin proxy reaches the requested page", async ({ page, context }) => {
  const violations = await trackCspViolations(page)
  await page.goto("/en/dashboard/users")

  const loginLink = page.getByText("Login", { exact: true })
  if (await loginLink.count()) await loginLink.first().click()
  await page.locator('input[type="email"], input[name="email"]').first().fill("founder@saas.test")
  await page.locator('input[type="password"]').fill("Password123!")
  await page.locator('button[type="submit"]').first().click()

  await expect(page).toHaveURL(/\/en\/dashboard\/users$/)
  const cookies = await context.cookies()
  expect(cookies.find((c) => c.name === "token")?.httpOnly).toBe(true)

  // A full reload goes through the server-side guard
  await page.reload()
  await expect(page).toHaveURL(/\/en\/dashboard\/users$/)
  // The signed-in user's name is in the profile menu (the top bar shows it only on wide screens)
  await page.getByRole("button", { name: "Profile" }).click()
  await expect(page.getByRole("menu").getByText("Proxy User")).toBeVisible()
  expect(violations).toEqual([])
})

test("phone layout: drawer navigation and no horizontal overflow", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await context.newPage()

  await page.goto("/en/dashboard/overview")
  await page.locator('input[type="email"], input[name="email"]').first().fill("founder@saas.test")
  await page.locator('input[type="password"]').fill("Password123!")
  await page.locator('button[type="submit"]').first().click()
  await expect(page).toHaveURL(/\/en\/dashboard\/overview$/)

  // The desktop rail is hidden on phones; navigation lives in the drawer
  await page.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("link", { name: "Invoices", exact: true }).click()
  await expect(page).toHaveURL(/\/en\/dashboard\/invoices$/)
  await expect(page.getByRole("heading", { level: 1, name: "Invoices" })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await context.close()
})
