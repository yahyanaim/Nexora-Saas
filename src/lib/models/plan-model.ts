import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPlan extends Document {
  name: string
  price: string
  period: string | null
  description: string
  featured: boolean
  features: string[]
  createdAt: Date
  updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
    },
    price: {
      type: String,
      required: [true, "Price is required"],
    },
    period: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    features: {
      type: [String],
      required: [true, "At least one feature is required"],
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0 && v.every((f) => f.trim() !== "")
        },
        message: "At least one valid feature is required",
      },
    },
  },
  { timestamps: true }
)

PlanSchema.index({ name: 1 })
PlanSchema.index({ featured: 1 })

const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema)

export default Plan
