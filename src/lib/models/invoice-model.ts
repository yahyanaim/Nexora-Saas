import mongoose, { Schema, Document, Model } from "mongoose"
import { InvoiceStatus, InvoiceMethod } from "@/types/invoices"

export interface IInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface IInvoice extends Document {
  invoiceNumber: string
  user: mongoose.Types.ObjectId
  items: IInvoiceItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  status: InvoiceStatus
  method: InvoiceMethod
  date: Date
  dueDate?: Date
  paidAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
})

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: {
        validator: function (v: IInvoiceItem[]) {
          return v && v.length > 0
        },
        message: "At least one item is required",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },
    method: {
      type: String,
      enum: Object.values(InvoiceMethod),
      required: true,
    },
    date: { type: Date, default: Date.now },
    dueDate: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
)

InvoiceSchema.index({ user: 1, status: 1 })
InvoiceSchema.index({ date: -1 })
InvoiceSchema.index({ invoiceNumber: 1 })

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema)

export default Invoice
