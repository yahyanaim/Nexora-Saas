import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  successResponse,
  successPaginatedResponse,
  formatDocuments,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"
import Invoice from "@/lib/models/invoice-model"
import { InvoiceStatus, InvoiceMethod } from "@/types/invoices"
import { Types } from "mongoose"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const { searchParams } = new URL(req.url)

      const query: QueryDto = {
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page")!)
          : 0,
        pageSize: searchParams.get("pageSize")
          ? parseInt(searchParams.get("pageSize")!)
          : 10,
        search: searchParams.get("search") || undefined,
        sort: searchParams.get("sort")
          ? JSON.parse(searchParams.get("sort")!)
          : undefined,
        filter: JSON.parse(searchParams.get("filter") || "[]"),
      }

      const result = await aggregateQuery({
        query,
        options: {
          model: Invoice,
          allowedSearchFields: ["invoiceNumber", "notes"],
          allowedFilterFields: ["status", "method", "user"],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                user: {
                  id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  avatar: "$user.avatar",
                  profileColor: "$user.profileColor",
                },
                invoiceNumber: 1,
                items: 1,
                subtotal: 1,
                tax: 1,
                taxRate: 1,
                total: 1,
                status: 1,
                method: 1,
                date: 1,
                dueDate: 1,
                paidAt: 1,
                notes: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      })

      const formattedInvoices = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedInvoices,
        pagination: result.pagination,
        message: "Invoices fetched successfully",
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

async function generateInvoiceNumber(): Promise<string> {
  await connectDB()
  const count = await Invoice.countDocuments()
  const nextNumber = count + 1
  return `INV-${String(nextNumber).padStart(4, "0")}`
}

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { user, items, status, method, taxRate = 0, dueDate, notes } = body

      if (!user || !items || items.length === 0) {
        return errorResponse({
          message: "User ID and at least one item are required",
          status: 400,
        })
      }

      const invoiceNumber = await generateInvoiceNumber()

      const subtotal = items.reduce(
        (sum: number, item: any) =>
          sum + (item.quantity || 0) * (item.unitPrice || 0),
        0
      )
      const tax = subtotal * taxRate
      const total = subtotal + tax

      const itemsWithTotal = items.map((item: any) => ({
        ...item,
        total: (item.quantity || 0) * (item.unitPrice || 0),
      }))

      await connectDB()

      const invoice = await Invoice.create({
        invoiceNumber,
        user: new Types.ObjectId(user),
        items: itemsWithTotal,
        subtotal,
        tax,
        taxRate,
        total,
        status: status || InvoiceStatus.DRAFT,
        method: method || InvoiceMethod.STRIPE,
        date: new Date(),
        dueDate: dueDate || null,
        notes: notes || "",
      })

      const populatedInvoice: any = await Invoice.findById(invoice._id)
        .populate("user", "name email avatar company address")
        .lean()
        .exec()

      const formattedInvoice = {
        id: populatedInvoice?._id.toString(),
        invoiceNumber: populatedInvoice?.invoiceNumber,
        user: populatedInvoice?.user
          ? {
              id: populatedInvoice?.user?._id.toString(),
              name: populatedInvoice?.user?.name,
              email: populatedInvoice?.user?.email,
              avatar: populatedInvoice?.user?.avatar,
              company: populatedInvoice?.user?.company,
              address: populatedInvoice?.user?.address,
            }
          : null,
        items: populatedInvoice?.items,
        subtotal: populatedInvoice?.subtotal,
        tax: populatedInvoice?.tax,
        taxRate: populatedInvoice?.taxRate,
        total: populatedInvoice?.total,
        status: populatedInvoice?.status,
        method: populatedInvoice?.method,
        date: populatedInvoice?.date,
        dueDate: populatedInvoice?.dueDate,
        notes: populatedInvoice?.notes,
        createdAt: populatedInvoice?.createdAt,
        updatedAt: populatedInvoice?.updatedAt,
      }

      return successResponse({
        data: formattedInvoice,
        status: 201,
        message: "Invoice created successfully",
      })
    } catch (error: any) {
      if (error.code === 11000) {
        try {
          const invoiceNumber = await generateInvoiceNumber()
          const body = await req.json()
          const {
            user,
            items,
            status,
            method,
            taxRate = 0,
            dueDate,
            notes,
          } = body

          const subtotal = items.reduce(
            (sum: number, item: any) =>
              sum + (item.quantity || 0) * (item.unitPrice || 0),
            0
          )
          const tax = subtotal * taxRate
          const total = subtotal + tax

          const itemsWithTotal = items.map((item: any) => ({
            ...item,
            total: (item.quantity || 0) * (item.unitPrice || 0),
          }))

          const invoice = await Invoice.create({
            invoiceNumber,
            user: new Types.ObjectId(user),
            items: itemsWithTotal,
            subtotal,
            tax,
            taxRate,
            total,
            status: status || InvoiceStatus.DRAFT,
            method: method || InvoiceMethod.STRIPE,
            date: new Date(),
            dueDate: dueDate || null,
            notes: notes || "",
          })

          const populatedInvoice: any = await Invoice.findById(invoice._id)
            .populate("user", "name email avatar company address")
            .lean()
            .exec()

          const formattedInvoice = {
            id: populatedInvoice?._id.toString(),
            invoiceNumber: populatedInvoice?.invoiceNumber,
            user: populatedInvoice?.user
              ? {
                  id: populatedInvoice?.user?._id.toString(),
                  name: populatedInvoice?.user?.name,
                  email: populatedInvoice?.user?.email,
                  avatar: populatedInvoice?.user?.avatar,
                  company: populatedInvoice?.user?.company,
                  address: populatedInvoice?.user?.address,
                }
              : null,
            items: populatedInvoice?.items,
            subtotal: populatedInvoice?.subtotal,
            tax: populatedInvoice?.tax,
            taxRate: populatedInvoice?.taxRate,
            total: populatedInvoice?.total,
            status: populatedInvoice?.status,
            method: populatedInvoice?.method,
            date: populatedInvoice?.date,
            dueDate: populatedInvoice?.dueDate,
            notes: populatedInvoice?.notes,
            createdAt: populatedInvoice?.createdAt,
            updatedAt: populatedInvoice?.updatedAt,
          }

          return successResponse({
            data: formattedInvoice,
            status: 201,
            message: "Invoice created successfully",
          })
        } catch (retryError: any) {
          return errorResponse({
            message: retryError.message || "Failed to create invoice",
            status: 500,
          })
        }
      }

      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.INVOICES_CREATE],
  }
)
