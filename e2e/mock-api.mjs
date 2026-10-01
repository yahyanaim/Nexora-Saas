/**
 * Minimal mock backend for the end-to-end suite.
 * The app is built with API_PROXY_TARGET pointing here, so requests reach it
 * through the same-origin /api proxy and its cookies are first-party.
 */
import http from "node:http"
const user = { id: "u1", name: "Proxy User", email: "founder@saas.test", role: "admin" }
http.createServer((req, res) => {
  const cookie = req.headers.cookie || ""
  const authed = /(^|; )token=valid/.test(cookie)
  const json = (status, body, headers = {}) => {
    res.writeHead(status, { "Content-Type": "application/json", ...headers })
    res.end(JSON.stringify(body))
  }
  if (req.url === "/api/auth/login" && req.method === "POST")
    return json(200, { success: true, user }, { "Set-Cookie": "token=valid; Path=/; HttpOnly; SameSite=Lax" })
  if (req.url === "/api/auth/me") return authed ? json(200, user) : json(401, { message: "Unauthorized" })
  if (req.url === "/api/auth/refresh") return json(401, { message: "no" })
  return authed ? json(200, { data: [] }) : json(401, { message: "Unauthorized" })
}).listen(Number(process.env.MOCK_API_PORT ?? 4500), "127.0.0.1")
