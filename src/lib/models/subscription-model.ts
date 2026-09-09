import mongoose, { Schema, Document, Model } from "mongoose"
import { SubscriptionStatus } from "@/types/subscriptions"

export interface ISubscription extends Document {
  name: string
  description?: string
  price: string
  period: string | null
  status: SubscriptionStatus
  features: string[]
  user: mongoose.Types.ObjectId | null
  plan: mongoose.Types.ObjectId | null
  nextBilling: Date | null
  billingCycle: string | null
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: String,
      required: [true, "Price is required"],
    },
    period: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true,
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
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },
    nextBilling: {
      type: Date,
      default: null,
    },
    billingCycle: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

SubscriptionSchema.index({ status: 1, userId: 1 })
SubscriptionSchema.index({ createdAt: -1 })

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema)

export default Subscription
