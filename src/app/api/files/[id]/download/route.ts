// app/api/files/[id]/download/route.ts

import { NextRequest } from "next/server"
import File from "@/lib/models/file-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// GET /api/files/[id]/download - Get file download URL
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

    const file = await File.findById(id)
      .populate("owner", "name email avatar")
      .lean()
      .exec()

    if (!file) {
      return errorResponse({
        message: "File not found",
        status: 404,
      })
    }

    // Increment download count
    await File.findByIdAndUpdate(id, {
      $inc: { downloadedCount: 1 },
    })

    // Get Cloudinary URL or generate signed URL
    let downloadUrl = file.cloudinaryUrl

    // If file is on Cloudinary, we can generate a signed URL for download
    if (file.cloudinaryId) {
      const cloudinary = require("cloudinary").v2
      // Generate signed URL with download flag
      downloadUrl = cloudinary.utils.private_download_url(
        file.cloudinaryId,
        file.name,
        { format: file.extension }
      )
    }

    // Fallback to stored URL
    if (!downloadUrl) {
      downloadUrl = `/api/files/${id}/stream`
    }

    return successResponse({
      data: {
        url: downloadUrl,
        filename: file.name,
        size: file.size,
        type: file.mimeType || "application/octet-stream",
        thumbnail: file.thumbnail,
      },
      message: "File download URL generated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF, UserType.USER],
    requiredPermissions: [AdminPermissionsPlatform.FILES_READ],
  }
)
