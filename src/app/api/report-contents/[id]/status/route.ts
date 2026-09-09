// app/api/report-contents/[id]/status/route.ts

import { NextRequest } from "next/server"
import ContentReport from "@/lib/models/content-report-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { ReportStatus } from "@/types/reports"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// PUT /api/report-contents/[id]/status - Update report status
export const PUT = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid report ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { status, resolutionNotes, actionTaken } = body

    if (!status || !Object.values(ReportStatus).includes(status)) {
      return errorResponse({
        message: `Invalid status. Must be: ${Object.values(ReportStatus).join(", ")}`,
        status: 400,
      })
    }

    await connectDB()

    const report = await ContentReport.findById(id)
    if (!report) {
      return errorResponse({
        message: "Report not found",
        status: 404,
      })
    }

    const userId = ctx.user.id

    report.status = status
    if (status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED) {
      report.resolvedAt = new Date()
      report.resolvedBy = userId
    }
    if (resolutionNotes) report.resolutionNotes = resolutionNotes
    if (actionTaken) report.actionTaken = actionTaken

    await report.save()

    return successResponse({
      data: {
        id: report._id.toString(),
        status: report.status,
        resolvedAt: report.resolvedAt,
      },
      message: `Report status updated to ${status}`,
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.REPORTS_UPDATE],
  }
)
