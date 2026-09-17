import { NextResponse } from "next/server"

/**
 * 410 Gone — Starter backend has been removed.
 * All API requests must go to Architecture API directly via NEXT_PUBLIC_API_URL.
 * Never query a database locally.
 */
function goneResponse() {
  return NextResponse.json(
    {
      message:
        "Gone — Starter backend has been removed. Call Architecture API directly via NEXT_PUBLIC_API_URL.",
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
