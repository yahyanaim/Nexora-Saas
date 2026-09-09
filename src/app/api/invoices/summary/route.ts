// app/api/invoices/summary/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { InvoiceStatus } from "@/types/invoices"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import Invoice from "@/lib/models/invoice-model"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const invoices = await Invoice.find().lean().exec()

      let totalRevenue = 0
      let paid = 0
      let pending = 0
      let overdue = 0
      let cancelled = 0

      invoices.forEach((invoice) => {
        if (invoice.status === InvoiceStatus.PAID) {
          totalRevenue += invoice.total
          paid += 1
        } else if (invoice.status === InvoiceStatus.PENDING) {
          pending += 1
        } else if (invoice.status === InvoiceStatus.OVERDUE) {
          overdue += 1
          totalRevenue += invoice.total
        } else if (invoice.status === InvoiceStatus.CANCELLED) {
          cancelled += 1
        }
      })

      const summary = {
        totalRevenue,
        paid,
        pending,
        overdue,
        cancelled,
        totalInvoices: invoices.length,
        paidPercentage:
          invoices.length > 0 ? Math.round((paid / invoices.length) * 100) : 0,
      }

      return successResponse({
        data: summary,
        message: "Summary fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_READ],
  }
)
