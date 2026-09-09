// app/api/auth/me/route.ts

import { NextRequest } from "next/server"
import { withAuth } from "@/lib/auth/guards"
import { successResponse, errorResponse } from "@/lib/helpers/response-helpers"
import { formatUserResponse } from "@/lib/helpers/user-helpers"

export const GET = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const user = ctx.user

    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }

    const formattedUser = formatUserResponse(user)

    return successResponse({
      data: formattedUser,
      message: "User fetched successfully",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Failed to fetch user",
      status: 500,
    })
  }
})
