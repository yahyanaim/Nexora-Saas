// app/api/projects/[id]/route.ts

import { NextRequest } from "next/server"
import Project from "@/lib/models/project-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { ProjectStatus } from "@/types/projects"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import { Types } from "mongoose"

// GET /api/projects/[id] - Get single project
export const GET = withAuth(
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

    const project: any = await Project.findById(id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("tasks.assignee", "name email avatar")
      .populate("files.uploadedBy", "name email avatar")
      .populate("activities.user", "name email avatar")
      .lean()
      .exec()

    if (!project) {
      return errorResponse({
        message: "Project not found",
        status: 404,
      })
    }

    const formattedProject = {
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      owner: {
        id: project.owner._id.toString(),
        name: project.owner.name,
        email: project.owner.email,
        avatar: project.owner.avatar,
      },
      members: project.members.map((m: any) => ({
        id: m._id.toString(),
        user: {
          id: m.user._id.toString(),
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
        },
        role: m.role,
      })),
      tasks: project.tasks.map((t: any) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        assignee: t.assignee
          ? {
              id: t.assignee._id.toString(),
              name: t.assignee.name,
              avatar: t.assignee.avatar,
            }
          : null,
        dueDate: t.dueDate,
      })),
      files: project.files.map((f: any) => ({
        id: f._id.toString(),
        name: f.name,
        size: f.size,
        uploadedBy: {
          id: f.uploadedBy._id.toString(),
          name: f.uploadedBy.name,
          avatar: f.uploadedBy.avatar,
        },
        uploadedAt: f.uploadedAt,
      })),
      activities: project.activities.map((a: any) => ({
        id: a._id.toString(),
        user: {
          id: a.user._id.toString(),
          name: a.user.name,
          avatar: a.user.avatar,
        },
        action: a.action,
        description: a.description,
        timestamp: a.timestamp,
      })),
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }

    return successResponse({
      data: formattedProject,
      message: "Project fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_READ],
  }
)

// PATCH /api/projects/[id] - Update project
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid project ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { name, description, status, owner, members, startDate, endDate } =
      body

    await connectDB()

    const project = await Project.findById(id)
    if (!project) {
      return errorResponse({
        message: "Project not found",
        status: 404,
      })
    }

    // Update fields
    if (owner !== undefined) project.owner = new Types.ObjectId(owner)
    if (name !== undefined) project.name = name
    if (description !== undefined) project.description = description
    if (status !== undefined) {
      if (!Object.values(ProjectStatus).includes(status)) {
        return errorResponse({
          message: `Invalid status. Must be: ${Object.values(ProjectStatus).join(", ")}`,
          status: 400,
        })
      }
      project.status = status
    }
    if (startDate !== undefined) project.startDate = startDate
    if (endDate !== undefined) project.endDate = endDate

    // Update members
    if (members !== undefined) {
      const currentMembers = project.members.map((m: any) => m.user.toString())
      const newMembers = members

      // Add new members
      const toAdd = newMembers.filter(
        (id: string) => !currentMembers.includes(id)
      )
      toAdd.forEach((id: string) => {
        project.members.push({ user: new Types.ObjectId(id), role: "MEMBER" })
      })

      // Remove members (keep owner)
      const ownerId = project.owner.toString()
      const toRemove = currentMembers.filter(
        (id: string) => !newMembers.includes(id) && id !== ownerId
      )
      project.members = project.members.filter(
        (m: any) => !toRemove.includes(m.user.toString())
      )
    }

    await project.save()

    const populatedProject: any = await Project.findById(id)
      .populate("owner", "name email profileColor avatar")
      .populate("members.user", "name email profileColor avatar")
      .lean()
      .exec()

    const formattedProject = {
      id: populatedProject._id.toString(),
      name: populatedProject.name,
      description: populatedProject.description,
      status: populatedProject.status,
      owner: {
        id: populatedProject.owner._id.toString(),
        name: populatedProject.owner.name,
        email: populatedProject.owner.email,
        avatar: populatedProject.owner.avatar,
        profileColor: populatedProject.owner.profileColor,
      },
      members: populatedProject.members.map((m: any) => ({
        id: m._id.toString(),
        user: {
          id: m.user._id.toString(),
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          profileColor: m.user.profileColor,
        },
        role: m.role,
      })),
      tasks: populatedProject.tasks || [],
      files: populatedProject.files || [],
      activities: populatedProject.activities || [],
      progress: populatedProject.progress,
      startDate: populatedProject.startDate,
      endDate: populatedProject.endDate,
      createdAt: populatedProject.createdAt,
      updatedAt: populatedProject.updatedAt,
    }

    return successResponse({
      data: formattedProject,
      message: "Project updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_UPDATE],
  }
)

// DELETE /api/projects/[id] - Delete project
export const DELETE = withAuth(
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

    await Project.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Project deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_DELETE],
  }
)
