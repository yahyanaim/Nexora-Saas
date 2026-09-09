import { AdminPermissionsPlatform } from "@/types/roles"
import { ActivationStatus } from "@/types/users"
import mongoose, { Schema, Document } from "mongoose"

export interface IRole extends Document {
  name: string
  permissions: AdminPermissionsPlatform[]
  status: ActivationStatus
  createdAt: Date
  updatedAt: Date
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    permissions: {
      type: [String],
      enum: Object.values(AdminPermissionsPlatform),
      default: Object.values(AdminPermissionsPlatform),
    },
    status: {
      type: String,
      enum: Object.values(ActivationStatus),
      default: ActivationStatus.ACTIVE,
      index: true,
    },
  },
  { timestamps: true }
)

const Role = mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema)

export default Role
