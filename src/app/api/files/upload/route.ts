// app/api/files/upload/route.ts

import { NextRequest } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { FileType, FileVisibility } from "@/types/files"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import File from "@/lib/models/file-model"
import { Types } from "mongoose"
import streamifier from "streamifier"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

// POST /api/files/upload - Upload file to Cloudinary
export const POST = withAuth(
  async (req: NextRequest, ctx: any) => {
    try {
      const formData = await req.formData()
      const file = formData.get("file") as File
      const projectId = formData.get("projectId") as string

      if (!file) {
        return errorResponse({
          message: "File is required",
          status: 400,
        })
      }

      await connectDB()

      const userId = ctx.user.id
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Determine file type
      const ext = file.name.split(".").pop()?.toLowerCase() || ""
      const imageTypes = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "svg",
        "webp",
        "bmp",
        "ico",
      ]
      const documentTypes = [
        "pdf",
        "doc",
        "docx",
        "txt",
        "rtf",
        "odt",
        "xls",
        "xlsx",
        "csv",
        "ppt",
        "pptx",
      ]
      const videoTypes = ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"]
      const audioTypes = ["mp3", "wav", "aac", "flac", "ogg", "wma"]
      const archiveTypes = ["zip", "rar", "7z", "tar", "gz"]

      let fileType = FileType.OTHER
      if (imageTypes.includes(ext)) fileType = FileType.IMAGE
      else if (documentTypes.includes(ext)) fileType = FileType.DOCUMENT
      else if (videoTypes.includes(ext)) fileType = FileType.VIDEO
      else if (audioTypes.includes(ext)) fileType = FileType.AUDIO
      else if (archiveTypes.includes(ext)) fileType = FileType.ARCHIVE

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `uploads/${userId}`,
            public_id: `${Date.now()}_${file.name.split(".")[0]}`,
            resource_type: "auto",
            use_filename: true,
            unique_filename: true,
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        streamifier.createReadStream(buffer).pipe(uploadStream)
      })

      // Log Cloudinary response for debugging
      console.log("Cloudinary Upload Result:", {
        cloudinaryId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
      })

      // Create file record in database
      const fileData: any = {
        name: file.name,
        type: fileType,
        mimeType: file.type,
        size: file.size,
        extension: ext,
        visibility: FileVisibility.PRIVATE,
        owner: new Types.ObjectId(userId),
        uploadedAt: new Date(),
        modifiedAt: new Date(),
        downloadedCount: 0,
        project: projectId ? new Types.ObjectId(projectId) : null,
        starred: false,
        cloudinaryId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        thumbnail: uploadResult.secure_url?.replace(
          "/upload/",
          "/upload/w_200,h_200,c_fit/"
        ),
      }

      console.log("File Data to save:", fileData)

      const newFile: any = await File.create(fileData)

      // Get populated file
      const populatedFile: any = await File.findById(newFile._id)
        .populate("owner", "name email avatar")
        .populate("project", "name")
        .lean()
        .exec()

      // Check if populated file has cloudinary data
      console.log("Populated File:", {
        id: populatedFile?._id,
        name: populatedFile?.name,
        cloudinaryId: populatedFile?.cloudinaryId,
        cloudinaryUrl: populatedFile?.cloudinaryUrl,
        thumbnail: populatedFile?.thumbnail,
      })

      // Format response
      const formattedFile = {
        id: populatedFile._id.toString(),
        name: populatedFile.name,
        type: populatedFile.type,
        mimeType: populatedFile.mimeType,
        size: populatedFile.size,
        extension: populatedFile.extension,
        visibility: populatedFile.visibility,
        owner: populatedFile.owner
          ? {
              id: populatedFile.owner._id.toString(),
              name: populatedFile.owner.name,
              email: populatedFile.owner.email,
              avatar: populatedFile.owner.avatar,
            }
          : null,
        uploadedAt: populatedFile.uploadedAt,
        modifiedAt: populatedFile.modifiedAt,
        downloadedCount: populatedFile.downloadedCount,
        projectId: populatedFile.project?._id?.toString() || null,
        projectName: populatedFile.project?.name || null,
        starred: populatedFile.starred,
        cloudinaryId: populatedFile.cloudinaryId,
        cloudinaryUrl: populatedFile.cloudinaryUrl,
        thumbnail: populatedFile.thumbnail,
        createdAt: populatedFile.createdAt,
        updatedAt: populatedFile.updatedAt,
      }

      return successResponse({
        data: formattedFile,
        status: 201,
        message: "File uploaded successfully to Cloudinary",
      })
    } catch (error: any) {
      console.error("Upload error:", error)
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF, UserType.USER],
    requiredPermissions: [AdminPermissionsPlatform.FILES_CREATE],
  }
)
