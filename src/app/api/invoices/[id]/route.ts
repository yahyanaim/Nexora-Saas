// app/api/invoices/[id]/route.ts

import { NextRequest } from "next/server"
import Invoice from "@/lib/models/invoice-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { InvoiceStatus, InvoiceMethod } from "@/types/invoices"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import { Types } from "mongoose"

// GET /api/invoices/[id] - Get single invoice
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid invoice ID",
        status: 400,
      })
    }

    await connectDB()

    const invoice: any = await Invoice.findById(id)
      .populate("user", "name email avatar profileColor")
      .lean()
      .exec()

    if (!invoice) {
      return errorResponse({
        message: "Invoice not found",
        status: 404,
      })
    }

    const formattedInvoice = {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      user: invoice.user
        ? {
            id: invoice.user._id.toString(),
            name: invoice.user.name,
            email: invoice.user.email,
            avatar: invoice.user.avatar,
            profileColor: invoice.user.profileColor,
          }
        : null,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      taxRate: invoice.taxRate,
      total: invoice.total,
      status: invoice.status,
      method: invoice.method,
      date: invoice.date,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }

    return successResponse({
      data: formattedInvoice,
      message: "Invoice fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_READ],
  }
)

// PATCH /api/invoices/[id] - Update invoice
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid invoice ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { user, items, status, method, taxRate, dueDate, notes } = body

    await connectDB()

    const invoice = await Invoice.findById(id)
    if (!invoice) {
      return errorResponse({
        message: "Invoice not found",
        status: 404,
      })
    }

    // Update items and recalculate totals
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse({
          message: "At least one item is required",
          status: 400,
        })
      }
      const itemsWithTotal = items.map((item: any) => ({
        ...item,
        total: (item.quantity || 0) * (item.unitPrice || 0),
      }))
      invoice.items = itemsWithTotal

      // Recalculate totals
      const subtotal = itemsWithTotal.reduce(
        (sum: number, item: any) => sum + (item.total || 0),
        0
      )
      const taxRateValue = taxRate !== undefined ? taxRate : invoice.taxRate
      const tax = subtotal * taxRateValue
      const total = subtotal + tax

      invoice.subtotal = subtotal
      invoice.tax = tax
      invoice.total = total
      if (taxRate !== undefined) invoice.taxRate = taxRate
    }

    if (status !== undefined) {
      if (!Object.values(InvoiceStatus).includes(status)) {
        return errorResponse({
          message: `Invalid status. Must be: ${Object.values(InvoiceStatus).join(", ")}`,
          status: 400,
        })
      }
      invoice.status = status
      if (status === InvoiceStatus.PAID) {
        invoice.paidAt = new Date()
      }
    }

    if (method !== undefined) {
      if (!Object.values(InvoiceMethod).includes(method)) {
        return errorResponse({
          message: `Invalid method. Must be: ${Object.values(InvoiceMethod).join(", ")}`,
          status: 400,
        })
      }
      invoice.method = method
    }

    if (dueDate !== undefined) invoice.dueDate = dueDate
    if (notes !== undefined) invoice.notes = notes
    if (user !== undefined) invoice.user = new Types.ObjectId(user)

    await invoice.save()

    const populatedInvoice: any = await Invoice.findById(id)
      .populate("user", "name email avatar profileColor")
      .lean()
      .exec()

    const formattedInvoice = {
      id: populatedInvoice._id.toString(),
      invoiceNumber: populatedInvoice.invoiceNumber,
      user: populatedInvoice.user
        ? {
            id: populatedInvoice.user._id.toString(),
            name: populatedInvoice.user.name,
            email: populatedInvoice.user.email,
            avatar: populatedInvoice.user.avatar,
            profileColor: populatedInvoice.user.profileColor,
          }
        : null,
      items: populatedInvoice.items,
      subtotal: populatedInvoice.subtotal,
      tax: populatedInvoice.tax,
      taxRate: populatedInvoice.taxRate,
      total: populatedInvoice.total,
      status: populatedInvoice.status,
      method: populatedInvoice.method,
      date: populatedInvoice.date,
      dueDate: populatedInvoice.dueDate,
      paidAt: populatedInvoice.paidAt,
      notes: populatedInvoice.notes,
      createdAt: populatedInvoice.createdAt,
      updatedAt: populatedInvoice.updatedAt,
    }

    return successResponse({
      data: formattedInvoice,
      message: "Invoice updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_UPDATE],
  }
)

// DELETE /api/invoices/[id] - Delete invoice
export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid invoice ID",
        status: 400,
      })
    }

    await connectDB()

    const invoice = await Invoice.findById(id)
    if (!invoice) {
      return errorResponse({
        message: "Invoice not found",
        status: 404,
      })
    }

    await Invoice.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Invoice deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_DELETE],
  }
)
