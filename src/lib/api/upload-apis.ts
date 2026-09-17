import axios from "axios"

export interface UploadResponse {
  url: string
  key: string
  fileName: string
  size: number
  contentType: string
  checksum: string
}

export interface FileInfo {
  key: string
  size: number
  contentType: string
  lastModified: string
  metadata: Record<string, string>
  url: string
  checksum: string | null
  originalName: string | null
}

export interface UploadOptions {
  folder?: string
  onProgress?: (progress: number) => void
}

const CLOUD_NAME = "du32f5rdn"
const UPLOAD_PRESET = "private_uploads"

export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const { folder = "shadow" } = options

  if (file.size === 0) throw new Error("File is empty")
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize)
    throw new Error(
      `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`
    )

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", UPLOAD_PRESET)
  formData.append("folder", folder)

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    formData,
    {
      onUploadProgress: (progressEvent: { loaded?: number; total?: number }) => {
        if (options.onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded! / progressEvent.total) * 100
          options.onProgress(progress)
        }
      },
    }
  )

  return {
    url: response.data.secure_url,
    key: response.data.publicid,
    ...response.data,
  }
}
export const extractKeyFromUrl = (url: string): string => {
  if (!url) return ""

  try {
    const parsedUrl = new URL(url)
    const parts = parsedUrl.pathname.split("/").filter(Boolean)

    const uploadIndex = parts.indexOf("upload")
    if (uploadIndex === -1) return ""

    const publicIdParts = parts.slice(uploadIndex + 1)

    if (publicIdParts[0]?.match(/^v\d+$/)) {
      publicIdParts.shift()
    }

    if (!publicIdParts.length) return ""

    const lastPart = publicIdParts.pop()!
    const fileNameWithoutExt = lastPart.replace(/\.[^/.]+$/, "")

    publicIdParts.push(fileNameWithoutExt)

    return publicIdParts.join("/")
  } catch {
    return ""
  }
}
export async function deleteFile(url: string) {
  const publicId = extractKeyFromUrl(url)
  if (!publicId) throw new Error("Public ID is required")

  await axios.post("/api/upload", { publicId })

  return { success: true, message: "Deleted successfully" }
}
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResponse[]> {
  const results: UploadResponse[] = []
  const errors: { file: string; error: string }[] = []

  for (const file of files) {
    try {
      const result = await uploadFile(file, options)
      results.push(result)
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  if (errors.length > 0) {
    console.warn("Some files failed to upload:", errors)
  }

  return results
}
