// lib/api/invoices-api.ts

import httpClient from "@/lib/myapi/client"
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
  } catch {
    // Fallback to demo invoices
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
  } catch {
    return getDemoInvoices().find((i) => i.id === id) || getDemoInvoices()[0]!
  }
}

export const createInvoiceApi = async (
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  try {
    const { data } = await httpClient.post("/invoices", payload)
    return data.data
  } catch {
    return addDemoInvoice(payload)
  }
}

export const updateInvoiceApi = async (
  id: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> => {
  try {
    const { data } = await httpClient.patch(`/invoices/${id}`, payload)
    return data.data
  } catch {
    const found = getDemoInvoices().find((i) => i.id === id)
    if (!found) return getDemoInvoices()[0]!
    return {
      ...found,
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.method ? { method: payload.method } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      ...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
      updatedAt: new Date().toISOString(),
    }
  }
}

export const deleteInvoiceApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/invoices/${id}`)
  } catch {
    deleteDemoInvoice(id)
  }
}

export const sendInvoiceApi = async (id: string): Promise<unknown> => {
  try {
    const { data } = await httpClient.post(`/invoices/${id}/send`)
    return data
  } catch {
    return { success: true, message: "Invoice sent via email (demo)" }
  }
}

export const downloadInvoiceApi = async (id: string): Promise<unknown> => {
  try {
    const { data } = await httpClient.get(`/invoices/${id}/download`)
    return data
  } catch {
    return { success: true }
  }
}

export const markAsPaidApi = async (id: string): Promise<Invoice> => {
  try {
    const { data } = await httpClient.post(`/invoices/${id}/mark-paid`)
    return data.data
  } catch {
    return markDemoInvoicePaid(id)
  }
}

export const fetchInvoicesSummaryApi = async (): Promise<InvoicesSummary> => {
  try {
    const { data } = await httpClient.get("/invoices/summary")
    if (data?.data) return data.data
  } catch {
    // Fallback to demo summary
  }
  return getDemoInvoicesSummary()
}
