// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/guards"
import { invalidateSession } from "@/lib/auth/sessions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const sessionId = ctx.sessionId

    if (sessionId) {
      await invalidateSession(sessionId)
    }

    const response = successResponse({
      data: null,
      message: "Logged out successfully",
    })

    return response
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Logout failed",
      status: 500,
    })
  }
})

// export async function POST_DIRECT(req: NextRequest) {
//   try {
//     const token =
//       req.cookies.get("token")?.value ||
//       req.headers.get("authorization")?.replace("Bearer ", "")

//     if (token) {
//       try {
//         const { verifyToken } = await import("@/lib/auth/sessions")
//         const payload = verifyToken(token)
//         if (payload?.sessionId) {
//           await invalidateSession(payload.sessionId)
//         }
//       } catch {
//         // Token invalid, still clear cookie
//       }
//     }

//     const response = NextResponse.json({
//       success: true,
//       message: "Logged out successfully",
//     })

//     response.cookies.set("token", "", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 0,
//       path: "/",
//     })

//     return response
//   } catch (error: any) {
//     return NextResponse.json(
//       {
//         success: false,
//         message: error.message || "Logout failed",
//       },
//       { status: 500 }
//     )
//   }
// }
