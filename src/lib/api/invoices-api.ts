// lib/api/invoices-api.ts

import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import type {
  ApiPaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import type {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoicesSummary,
} from "@/types/invoices"
import {
  getDemoInvoices,
  getDemoInvoicesSummary,
  addDemoInvoice,
  markDemoInvoicePaid,
  deleteDemoInvoice,
  paginateDemoList,
} from "@/lib/demo-data"

export const fetchInvoicesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Invoice>> => {
  try {
    const { data } = await httpClient.get("/invoices", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sort:
          params.sortBy && params.sortOrder
            ? JSON.stringify({
                [params.sortBy]: params.sortOrder === "desc" ? -1 : 1,
              })
            : undefined,
        filter: params.filter ? JSON.stringify(params.filter) : undefined,
      },
    })

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return {
        success: data.success ?? true,
        data: data.data || [],
        pagination: {
          page: data.pagination?.page || 0,
          pageSize: data.pagination?.pageSize || 0,
          totalItems: data.pagination?.totalItems || data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
          hasNextPage: data.pagination?.hasNextPage || false,
          hasPrevPage: data.pagination?.hasPrevPage || false,
        },
      }
    }
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch invoices")
    console.error("[API Error] fetchInvoicesApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  return paginateDemoList(
    getDemoInvoices(),
    params,
    (inv, search) =>
      inv.invoiceNumber.toLowerCase().includes(search) ||
      inv.user.name.toLowerCase().includes(search) ||
      (inv.user.email?.toLowerCase().includes(search) ?? false)
  )
}

export const getInvoiceApi = async (id: string): Promise<Invoice> => {
  try {
    const { data } = await httpClient.get(`/invoices/${id}`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Invoice ${id} not found`)
    console.error("[API Error] getInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoInvoices().find((i) => i.id === id)
      if (found) return found
      throw new Error(`Invoice with ID ${id} not found: ${message}`)
    }
    throw error
  }
}

export const createInvoiceApi = async (
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  try {
    const { data } = await httpClient.post("/invoices", payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to create invoice")
    console.error("[API Error] createInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return addDemoInvoice(payload)
    }
    throw error
  }
}

export const updateInvoiceApi = async (
  id: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> => {
  try {
    const { data } = await httpClient.patch(`/invoices/${id}`, payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to update invoice ${id}`)
    console.error("[API Error] updateInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoInvoices().find((i) => i.id === id)
      if (!found) throw new Error(`Invoice with ID ${id} not found: ${message}`)
      return {
        ...found,
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.method ? { method: payload.method } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
        updatedAt: new Date().toISOString(),
      }
    }
    throw error
  }
}

export const deleteInvoiceApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/invoices/${id}`)
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to delete invoice ${id}`)
    console.error("[API Error] deleteInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      deleteDemoInvoice(id)
      return
    }
    throw error
  }
}

export const sendInvoiceApi = async (id: string): Promise<unknown> => {
  try {
    const { data } = await httpClient.post(`/invoices/${id}/send`)
    return data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to send invoice ${id}`)
    console.error("[API Error] sendInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return { success: true, message: "Invoice sent via email (demo)" }
    }
    throw error
  }
}

export const downloadInvoiceApi = async (id: string): Promise<unknown> => {
  try {
    const { data } = await httpClient.get(`/invoices/${id}/download`)
    return data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to download invoice ${id}`)
    console.error("[API Error] downloadInvoiceApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return { success: true }
    }
    throw error
  }
}

export const markAsPaidApi = async (id: string): Promise<Invoice> => {
  try {
    const { data } = await httpClient.post(`/invoices/${id}/mark-paid`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to mark invoice ${id} as paid`)
    console.error("[API Error] markAsPaidApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return markDemoInvoicePaid(id)
    }
    throw error
  }
}

export const fetchInvoicesSummaryApi = async (): Promise<InvoicesSummary> => {
  try {
    const { data } = await httpClient.get("/invoices/summary")
    if (data?.data) return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch invoices summary")
    console.error("[API Error] fetchInvoicesSummaryApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }
  return getDemoInvoicesSummary()
}
