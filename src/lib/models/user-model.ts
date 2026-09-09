import { UserStatus, UserType } from "@/types/users"
import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  username?: string
  dateOfBirth?: Date
  password: string
  is2FA: boolean
  avatar?: string
  cover?: string
  profileColor?: string
  status: UserStatus
  userType: UserType
  roles: Types.ObjectId[]
  lastLoginAt?: Date
  bio?: string
  lastSeenAt: Date | null
  passcodeLock?: string
  isPasscodeLocked: boolean
  passwordResetToken?: string
  passwordResetExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: [true, "Name is required"] },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      select: false,
    },
    username: { type: String, unique: true, sparse: true },
    dateOfBirth: { type: Date },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    is2FA: { type: Boolean, default: false },
    avatar: { type: String },
    cover: { type: String },
    profileColor: { type: String },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.NOT_VERIFIED,
    },
    userType: {
      type: String,
      enum: Object.values(UserType),
      default: UserType.USER,
    },
    roles: {
      type: [{ type: Schema.Types.ObjectId, ref: "Role" }],
      default: [],
    },
    lastLoginAt: { type: Date },
    bio: { type: String },
    lastSeenAt: { type: Date, default: null },
    passcodeLock: { type: String, select: false },
    isPasscodeLocked: { type: Boolean, default: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
  },
  { timestamps: true }
)

UserSchema.index({ userType: 1 })
UserSchema.index({ lastSeenAt: 1 })
UserSchema.index({ status: 1 })

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User
