import { chromium } from "playwright"
const S = "/tmp/claude-0/-home-user-Nexora-Saas/0efee454-fd3b-5ec3-af5c-cf2020a282e9/scratchpad/"
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage()
await p.goto("http://localhost:3700/en/auth"); await p.waitForTimeout(3000)
await p.getByText("Or continue with Instant Demo Preview →").click()
await p.waitForURL(/dashboard/, { timeout: 30000 }); await p.waitForTimeout(1500)
for (const [loc, path] of [["en","client-invoices"],["en","timesheets"],["fr","clients"],["ar","receivables"]]) {
  await p.goto(`http://localhost:3700/${loc}/dashboard/${path}`); await p.waitForTimeout(4500)
  await p.screenshot({ path: `${S}guide-${loc}-${path}.png` })
}
await b.close()
