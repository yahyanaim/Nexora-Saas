// app/api/projects/summary/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ProjectStatus } from "@/types/projects"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import Project from "@/lib/models/project-model"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const projects = await Project.find()
        .populate("members.user", "name email avatar")
        .lean()
        .exec()

      let total = projects.length
      let active = 0
      let archived = 0
      let completed = 0
      let onHold = 0
      let totalMembers = 0
      let totalTasks = 0
      let completedTasks = 0
      let totalProgress = 0

      projects.forEach((project) => {
        if (project.status === ProjectStatus.ACTIVE) active += 1
        else if (project.status === ProjectStatus.ARCHIVED) archived += 1
        else if (project.status === ProjectStatus.COMPLETED) completed += 1
        else if (project.status === ProjectStatus.ON_HOLD) onHold += 1

        totalMembers += project.members?.length || 0
        totalTasks += project.tasks?.length || 0
        completedTasks +=
          project.tasks?.filter((t: any) => t.status === "done").length || 0
        totalProgress += project.progress || 0
      })

      const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0

      const summary = {
        total,
        active,
        archived,
        completed,
        onHold,
        totalMembers,
        totalTasks,
        completedTasks,
        avgProgress,
      }

      return successResponse({
        data: summary,
        message: "Projects summary fetched successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_READ],
  }
)
