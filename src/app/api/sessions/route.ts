import { NextRequest } from "next/server"
import Session from "@/lib/models/session-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { SessionStatus } from "@/types/sessions"
import {
  errorResponse,
  successResponse,
  formatDocuments,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"

export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    try {
      await connectDB()
      const { searchParams } = new URL(req.url)

      const query: QueryDto = {
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page")!)
          : 0,
        pageSize: searchParams.get("pageSize")
          ? parseInt(searchParams.get("pageSize")!)
          : 10,
        search: searchParams.get("search") || undefined,
        sort: searchParams.get("sort")
          ? JSON.parse(searchParams.get("sort")!)
          : undefined,
        filter: JSON.parse(searchParams.get("filter") || "[]"),
      }

      const result = await aggregateQuery({
        query,
        options: {
          model: Session,
          allowedFilterFields: ["user", "status"],
          sort: { lastUsedAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                id: "$_id",
                status: 1,
                lastUsedAt: 1,
                createdAt: 1,
                updatedAt: 1,
                ip: 1,
                userAgent: 1,
                expiresIn: 1,
                user: {
                  id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  avatar: "$user.avatar",
                  profileColor: "$user.profileColor",
                },
              },
            },
          ],
        },
      })

      const formattedSessions = formatDocuments(result.items)

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
