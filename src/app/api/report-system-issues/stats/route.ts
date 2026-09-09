// app/api/report-system-issues/stats/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { IssueStatus } from "@/types/reports"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import SystemIssue from "@/lib/models/system-issue-model"

// GET /api/report-system-issues/stats - Get issue stats
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const [total, open, inProgress, resolved, closed] = await Promise.all([
        SystemIssue.countDocuments(),
        SystemIssue.countDocuments({ status: IssueStatus.OPEN }),
        SystemIssue.countDocuments({ status: IssueStatus.IN_PROGRESS }),
        SystemIssue.countDocuments({ status: IssueStatus.RESOLVED }),
        SystemIssue.countDocuments({ status: IssueStatus.CLOSED }),
      ])

      const stats = {
        total,
        open,
        inProgress,
        resolved,
        closed,
      }

      return successResponse({
        data: stats,
        message: "Stats fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.REPORTS_READ],
  }
)
