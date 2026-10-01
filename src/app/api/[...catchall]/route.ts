import { NextResponse } from "next/server"

/**
 * 410 Gone — there is no backend in this app.
 * The browser calls the API directly via NEXT_PUBLIC_API_URL, or, when
 * API_PROXY_TARGET is set at build time, /api/* is rewritten to that backend
 * before this route is reached (see src/lib/api-proxy.ts).
 */
function goneResponse() {
  return NextResponse.json(
    {
      message:
        "Gone — this app has no backend. Call the API via NEXT_PUBLIC_API_URL, or set API_PROXY_TARGET at build time to proxy /api/* to it.",
      code: "backend_removed",
    },
    { status: 410 }
  )
}

export async function GET() {
  return goneResponse()
}

export async function POST() {
  return goneResponse()
}

export async function PUT() {
  return goneResponse()
}

export async function PATCH() {
  return goneResponse()
}

export async function DELETE() {
  return goneResponse()
}
