// app/api/files/summary/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { FileType } from "@/types/files"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import File from "@/lib/models/file-model"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const files = await File.find({ type: { $ne: FileType.FOLDER } })
        .lean()
        .exec()

      let totalFiles = 0
      let totalSize = 0
      let documents = 0
      let images = 0
      let videos = 0
      let archives = 0
      let others = 0

      files.forEach((file) => {
        totalFiles += 1
        totalSize += file.size

        switch (file.type) {
          case FileType.DOCUMENT:
            documents += 1
            break
          case FileType.IMAGE:
            images += 1
            break
          case FileType.VIDEO:
            videos += 1
            break
          case FileType.ARCHIVE:
            archives += 1
            break
          default:
            others += 1
            break
        }
      })

      const summary = {
        totalFiles,
        totalSize,
        documents,
        images,
        videos,
        archives,
        others,
      }

      return successResponse({
        data: summary,
        message: "Files summary fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF, UserType.USER],
    requiredPermissions: [AdminPermissionsPlatform.FILES_READ],
  }
)
