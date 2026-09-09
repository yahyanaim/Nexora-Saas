// types/files.ts

export enum FileType {
  FOLDER = "folder",
  DOCUMENT = "document",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  ARCHIVE = "archive",
  OTHER = "other",
}

export enum FileVisibility {
  PRIVATE = "private",
  TEAM = "team",
  PUBLIC = "public",
}

export interface FileOwner {
  id: string
  name: string
  email: string
  avatar?: string | null
}

export interface FileItem {
  id: string
  name: string
  type: FileType
  mimeType?: string
  size: number
  extension?: string
  visibility: FileVisibility
  owner: FileOwner
  uploadedAt: string
  modifiedAt: string
  downloadedCount?: number
  projectId?: string
  projectName?: string
  cloudinaryUrl?: string
  thumbnail?: string
  starred?: boolean
  children?: FileItem[]
}

export interface CreateFilePayload {
  file: File
  project?: string
  folderId?: string
}

export interface RenameFilePayload {
  name: string
}

export interface FileSummary {
  totalFiles: number
  totalSize: number
  documents: number
  images: number
  videos: number
  archives: number
  others: number
}
