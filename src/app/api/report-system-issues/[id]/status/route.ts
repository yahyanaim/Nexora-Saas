// app/api/report-system-issues/[id]/status/route.ts

import { NextRequest } from "next/server"
import SystemIssue from "@/lib/models/system-issue-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { IssueStatus } from "@/types/reports"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// PUT /api/report-system-issues/[id]/status - Update issue status
export const PUT = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid issue ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { status, resolutionNotes } = body

    if (!status || !Object.values(IssueStatus).includes(status)) {
      return errorResponse({
        message: `Invalid status. Must be: ${Object.values(IssueStatus).join(", ")}`,
        status: 400,
      })
    }

    await connectDB()

    const issue = await SystemIssue.findById(id)
    if (!issue) {
      return errorResponse({
        message: "Issue not found",
        status: 404,
      })
    }

    const userId = ctx.user.id

    issue.status = status
    if (status === IssueStatus.RESOLVED || status === IssueStatus.CLOSED) {
      issue.resolvedAt = new Date()
    }
    if (status === IssueStatus.IN_PROGRESS && !issue.assignedTo) {
      issue.assignedTo = userId
    }
    if (resolutionNotes) issue.resolutionNotes = resolutionNotes

    await issue.save()

    return successResponse({
      data: {
        id: issue._id.toString(),
        status: issue.status,
        assignedTo: issue.assignedTo,
        resolvedAt: issue.resolvedAt,
      },
      message: `Issue status updated to ${status}`,
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.REPORTS_UPDATE],
  }
)
