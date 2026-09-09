// lib/models/file-model.ts

import mongoose, { Schema, Document, Model } from "mongoose"
import { FileType, FileVisibility } from "@/types/files"

export interface IFile extends Document {
  name: string
  type: FileType
  mimeType?: string
  size: number
  extension?: string
  visibility: FileVisibility
  owner: mongoose.Types.ObjectId
  uploadedAt: Date
  modifiedAt: Date
  downloadedCount: number
  project?: mongoose.Types.ObjectId // اسمه project مش projectId
  starred: boolean
  parent?: mongoose.Types.ObjectId
  cloudinaryId?: string
  cloudinaryUrl?: string
  thumbnail?: string
  createdAt: Date
  updatedAt: Date
}

const FileSchema = new Schema<IFile>(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(FileType),
      required: true,
      index: true,
    },
    mimeType: { type: String },
    size: { type: Number, required: true, min: 0 },
    extension: { type: String },
    visibility: {
      type: String,
      enum: Object.values(FileVisibility),
      default: FileVisibility.PRIVATE,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedAt: { type: Date, default: Date.now },
    modifiedAt: { type: Date, default: Date.now },
    downloadedCount: { type: Number, default: 0 },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    starred: { type: Boolean, default: false, index: true },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "File",
      index: true,
    },
    cloudinaryId: { type: String, index: true },
    cloudinaryUrl: { type: String },
    thumbnail: { type: String },
  },
  { timestamps: true }
)

FileSchema.index({ owner: 1, type: 1 })
FileSchema.index({ project: 1, type: 1 })
FileSchema.index({ starred: 1 })
FileSchema.index({ name: "text" })

const File: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>("File", FileSchema)

export default File
