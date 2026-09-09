// app/api/files/[id]/route.ts

import { NextRequest } from "next/server"
import File from "@/lib/models/file-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// GET /api/files/[id] - Get single file
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid file ID",
        status: 400,
      })
    }

    await connectDB()

    const file: any = await File.findById(id)
      .populate("owner", "name email avatar")
      .populate("project", "name")
      .lean()
      .exec()

    if (!file) {
      return errorResponse({
        message: "File not found",
        status: 404,
      })
    }

    const formattedFile = {
      id: file._id.toString(),
      name: file.name,
      type: file.type,
      mimeType: file.mimeType,
      size: file.size,
      extension: file.extension,
      visibility: file.visibility,
      owner: file.owner
        ? {
            id: file.owner._id.toString(),
            name: file.owner.name,
            email: file.owner.email,
            avatar: file.owner.avatar,
          }
        : null,
      uploadedAt: file.uploadedAt,
      modifiedAt: file.modifiedAt,
      downloadedCount: file.downloadedCount,
      project: file.project?._id?.toString(),
      projectName: file.project?.name,
      starred: file.starred,
      parent: file.parent?.toString(),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }

    return successResponse({
      data: formattedFile,
      message: "File fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF, UserType.USER],
    requiredPermissions: [AdminPermissionsPlatform.FILES_READ],
  }
)

// PATCH /api/files/[id] - Update file
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid file ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { name, visibility, starred, parent } = body

    await connectDB()

    const file = await File.findById(id)
    if (!file) {
      return errorResponse({
        message: "File not found",
        status: 404,
      })
    }

    if (name !== undefined) {
      file.name = name
      file.modifiedAt = new Date()
    }
    if (visibility !== undefined) file.visibility = visibility
    if (starred !== undefined) file.starred = starred
    if (parent !== undefined) file.parent = parent

    await file.save()

    const updatedFile: any = await File.findById(id)
      .populate("owner", "name email avatar")
      .populate("project", "name")
      .lean()
      .exec()

    const formattedFile = {
      id: updatedFile._id.toString(),
      name: updatedFile.name,
      type: updatedFile.type,
      mimeType: updatedFile.mimeType,
      size: updatedFile.size,
      extension: updatedFile.extension,
      visibility: updatedFile.visibility,
      owner: updatedFile.owner
        ? {
            id: updatedFile.owner._id.toString(),
            name: updatedFile.owner.name,
            email: updatedFile.owner.email,
            avatar: updatedFile.owner.avatar,
          }
        : null,
      uploadedAt: updatedFile.uploadedAt,
      modifiedAt: updatedFile.modifiedAt,
      downloadedCount: updatedFile.downloadedCount,
      project: updatedFile.project?._id?.toString(),
      projectName: updatedFile.project?.name,
      starred: updatedFile.starred,
      parent: updatedFile.parent?.toString(),
      createdAt: updatedFile.createdAt,
      updatedAt: updatedFile.updatedAt,
    }

    return successResponse({
      data: formattedFile,
      message: "File updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.FILES_UPDATE],
  }
)

// DELETE /api/files/[id] - Delete file
export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid file ID",
        status: 400,
      })
    }

    await connectDB()

    const file = await File.findById(id)
    if (!file) {
      return errorResponse({
        message: "File not found",
        status: 404,
      })
    }

    await File.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "File deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.FILES_DELETE],
  }
)
