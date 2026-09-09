// app/api/report-contents/stats/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ReportStatus } from "@/types/reports"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import ContentReport from "@/lib/models/content-report-model"

// GET /api/report-contents/stats - Get report stats
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const [total, pending, reviewing, resolved, dismissed] =
        await Promise.all([
          ContentReport.countDocuments(),
          ContentReport.countDocuments({ status: ReportStatus.PENDING }),
          ContentReport.countDocuments({ status: ReportStatus.REVIEWING }),
          ContentReport.countDocuments({ status: ReportStatus.RESOLVED }),
          ContentReport.countDocuments({ status: ReportStatus.DISMISSED }),
        ])

      const stats = {
        total,
        pending,
        reviewing,
        resolved,
        dismissed,
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
