/**
 * Minimal stand-in for the Nexora server in the end-to-end suite (B1b step 5).
 * The app is built with API_PROXY_TARGET pointing here, so requests reach it
 * through the same-origin /api proxy and its cookies are first-party. It
 * answers like the server: realm paths (/api/app/v1/…), the HttpOnly session
 * cookie nx_m scoped to /api/app, the readable XSRF-TOKEN on "/", and the
 * double-submit check on writes (API contract §2).
 */
import http from "node:http"

const user = { id: "u1", name: "Proxy User", email: "founder@saas.test", locale: "en" }
const WS = "0190a7f2-0000-7000-8000-000000000001"
const SESSION = "valid-session"
const XSRF = "xsrf-value-for-the-e2e-suite"

http
  .createServer((req, res) => {
    const cookie = req.headers.cookie || ""
    const authed = new RegExp(`(^|; )nx_m=${SESSION}`).test(cookie)
    const path = (req.url || "").split("?")[0]
    const json = (status, body, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers })
      res.end(JSON.stringify(body))
    }
    const write = req.method !== "GET" && req.method !== "HEAD"
    if (path === "/api/app/v1/auth/login" && req.method === "POST")
      return json(200, { user }, {
        "Set-Cookie": [
          `nx_m=${SESSION}; Path=/api/app; HttpOnly; SameSite=Lax`,
          "nx_m_r=refresh; Path=/api/app/v1/auth; HttpOnly; SameSite=Lax",
          `XSRF-TOKEN=${XSRF}; Path=/; SameSite=Lax`,
        ],
      })
    if (path === "/api/app/v1/auth/refresh") return json(401, { code: "err_sessionEnded", values: {}, requestId: "mock" })
    if (!authed) return json(401, { code: "err_sessionEnded", values: {}, requestId: "mock" })
    // Writes carry the double-submit header (F11)
    if (write && req.headers["x-xsrf-token"] !== XSRF) return json(403, { code: "err_csrf", values: {}, requestId: "mock" })
    if (path === "/api/app/v1/auth/me") return json(200, { user, activeWorkspaceId: WS, twoFactorEnabled: true })
    if (path === "/api/app/v1/auth/2fa") return json(200, { enabled: true, recoveryCodesLeft: 10, passcodeSet: false, required: true })
    if (path === "/api/app/v1/me/workspaces") return json(200, [{ id: WS, name: "Atlas", slug: "atlas", currency: "MAD", role: { key: "admin", name: "Administrator" }, isOwner: true }])
    if (path === `/api/app/v1/workspaces/${WS}/context`) return json(200, { workspaceId: WS, role: { key: "admin", name: "Administrator" }, isOwner: true, permissions: ["*"] })
    if (path === "/api/app/v1/auth/logout") return json(204, {})
    return json(200, { data: [] })
  })
  .listen(Number(process.env.MOCK_API_PORT ?? 4500), "127.0.0.1")
