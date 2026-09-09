// app/api/invoices/[id]/mark-paid/route.ts

import { NextRequest } from "next/server"
import Invoice from "@/lib/models/invoice-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { InvoiceStatus } from "@/types/invoices"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// POST /api/invoices/[id]/mark-paid - Mark invoice as paid
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

    const invoice = await Invoice.findById(id)
    if (!invoice) {
      return errorResponse({
        message: "Invoice not found",
        status: 404,
      })
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return errorResponse({
        message: "Invoice is already paid",
        status: 400,
      })
    }

    invoice.status = InvoiceStatus.PAID
    invoice.paidAt = new Date()
    await invoice.save()

    return successResponse({
      data: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        paidAt: invoice.paidAt,
      },
      message: `Invoice ${invoice.invoiceNumber} marked as paid`,
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_UPDATE],
  }
)
