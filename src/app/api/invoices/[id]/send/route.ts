// app/api/invoices/[id]/send/route.ts

import { NextRequest } from "next/server"
import Invoice from "@/lib/models/invoice-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import { sendMail } from "@/lib/auth/email"

// POST /api/invoices/[id]/send - Send invoice to customer
export const POST = withAuth(
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
      .populate("user", "name email")
      .lean()
      .exec()

    if (!invoice) {
      return errorResponse({
        message: "Invoice not found",
        status: 404,
      })
    }

    // Send email
    await sendMail({
      to: invoice.user.email,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.user.name},</p>
        <p>Please find your invoice attached.</p>
        <p>Amount: $${invoice.total.toFixed(2)}</p>
        <p>Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}</p>
        <p>Status: ${invoice.status}</p>
        <p>Thank you for your business.</p>
      `,
    })

    return successResponse({
      data: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        sentTo: invoice.user.email,
      },
      message: `Invoice ${invoice.invoiceNumber} sent successfully`,
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_UPDATE],
  }
)
