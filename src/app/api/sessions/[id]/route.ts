// app/api/sessions/[id]/route.ts

import { NextRequest } from "next/server"
import Session from "@/lib/models/session-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { SessionStatus } from "@/types/sessions"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  formatDocument,
  successResponse,
} from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// GET /api/sessions/[id] - Get single session
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid session ID",
        status: 400,
      })
    }

    await connectDB()

    const session = await Session.findById(id)
      .populate("user", "name email avatar")
      .lean()
      .exec()

    if (!session) {
      return errorResponse({
        message: "Session not found",
        status: 404,
      })
    }

    // Check permission: admin or session owner
    const isAdmin = ctx.user.userType === UserType.ADMIN
    const isOwner = session.user._id.toString() === ctx.user.id

    if (!isAdmin && !isOwner) {
      return errorResponse({
        message: "You can only view your own sessions",
        status: 403,
      })
    }

    const formattedSession = formatDocument(session)

    return successResponse({
      data: formattedSession,
    })
  },
  { requireAuth: true }
)

// PATCH /api/sessions/[id] - Update session status
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid session ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { status } = body

    if (!status || !Object.values(SessionStatus).includes(status)) {
      return errorResponse({
        message: `Valid status is required: ${Object.values(SessionStatus).join(", ")}`,
        status: 400,
      })
    }

    await connectDB()

    const session = await Session.findById(id).populate("user", "name email")
    if (!session) {
      return errorResponse({
        message: "Session not found",
        status: 404,
      })
    }

    // Check permission: admin or session owner
    const isAdmin = ctx.user.userType === UserType.ADMIN
    const isOwner = session.user._id.toString() === ctx.user.id

    if (!isAdmin && !isOwner) {
      return errorResponse({
        message: "You can only update your own sessions",
        status: 403,
      })
    }

    // Prevent deactivating current session
    const isCurrent = session._id.toString() === ctx.sessionId
    if (isCurrent && status === SessionStatus.INACTIVE) {
      return errorResponse({
        message: "You cannot deactivate your current session",
        status: 400,
      })
    }

    session.status = status
    await session.save()

    const formattedSession = formatDocument(session)

    return successResponse({
      data: formattedSession,
      message: `Session ${status.toLowerCase()} successfully`,
    })
  },
  { requireAuth: true }
)

// DELETE /api/sessions/[id] - Delete session
export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid session ID",
        status: 400,
      })
    }

    await connectDB()

    const session = await Session.findById(id)
    if (!session) {
      return errorResponse({
        message: "Session not found",
        status: 404,
      })
    }

    // Check permission: admin or session owner
    const isAdmin = ctx.user.userType === UserType.ADMIN
    const isOwner = session.user.toString() === ctx.user.id

    if (!isAdmin && !isOwner) {
      return errorResponse({
        message: "You can only delete your own sessions",
        status: 403,
      })
    }

    // Prevent deleting current session
    if (session._id.toString() === ctx.sessionId) {
      return errorResponse({
        message: "You cannot delete your current session",
        status: 400,
      })
    }

    await Session.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Session deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.SESSIONS_DELETE],
  }
)
