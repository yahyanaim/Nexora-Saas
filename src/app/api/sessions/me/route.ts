import { NextRequest } from "next/server"
import Session from "@/lib/models/session-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { SessionStatus } from "@/types/sessions"
import {
  errorResponse,
  formatDocuments,
  successResponse,
} from "@/lib/helpers/response-helpers"

// GET /api/sessions/me - Get current user's sessions
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    try {
      await connectDB()

      const userId = ctx.user.id

      const sessions = await Session.find({
        user: userId,
      })
        .sort({ lastUsedAt: -1 })
        .lean()
        .exec()

      // Format sessions
      const formattedSessions = formatDocuments(sessions)

      // Mark current session
      const currentSessionId = ctx.sessionId
      const sessionsWithCurrent = formattedSessions.map((session: any) => ({
        ...session,
        isCurrent: session.id === currentSessionId,
      }))

      return successResponse({
        data: sessionsWithCurrent,
        message: "Sessions fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  { requireAuth: true }
)

// POST /api/sessions/me - Invalidate all sessions except current
export const POST = withAuth(
  async (req: NextRequest, ctx: any) => {
    try {
      await connectDB()

      const userId = ctx.user.id
      const currentSessionId = ctx.sessionId

      await Session.updateMany(
        {
          user: userId,
          _id: { $ne: currentSessionId },
          status: SessionStatus.ACTIVE,
        },
        {
          status: SessionStatus.INACTIVE,
        }
      )

      return successResponse({
        data: null,
        message: "All other sessions have been invalidated",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  { requireAuth: true }
)
