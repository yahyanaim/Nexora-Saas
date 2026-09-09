// app/api/projects/[id]/archive/route.ts

import { NextRequest } from "next/server"
import Project from "@/lib/models/project-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { ProjectStatus } from "@/types/projects"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// POST /api/projects/[id]/archive - Archive project
export const POST = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid project ID",
        status: 400,
      })
    }

    await connectDB()

    const project = await Project.findById(id)
    if (!project) {
      return errorResponse({
        message: "Project not found",
        status: 404,
      })
    }

    if (project.status === ProjectStatus.ARCHIVED) {
      return errorResponse({
        message: "Project is already archived",
        status: 400,
      })
    }

    project.status = ProjectStatus.ARCHIVED
    await project.save()

    return successResponse({
      data: {
        id: project._id.toString(),
        status: project.status,
      },
      message: "Project archived successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_UPDATE],
  }
)
