// app/api/files/[id]/download/route.ts

import { NextRequest } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import File from "@/lib/models/file-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

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

    let downloadUrl = file.cloudinaryUrl

    // If file is on Cloudinary, generate a proper download URL
    if (file.cloudinaryId) {
      try {
        // Generate a signed URL for download with proper format
        // Use the public_id directly, not the file name
        downloadUrl = cloudinary.url(file.cloudinaryId, {
          format: file.extension || "jpg",
          flags: "attachment",
          resource_type: "auto",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        })
      } catch (error) {
        console.error("Error generating Cloudinary URL:", error)
        // Fallback to the stored URL
        downloadUrl = file.cloudinaryUrl
      }
    }

    // Fallback to stream endpoint if no Cloudinary URL
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
