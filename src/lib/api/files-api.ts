// lib/api/files-api.ts

import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import { FileItem, FileSummary, FileType, FileVisibility } from "@/types/files"
import {
  getDemoFiles,
  getDemoFilesSummary,
  paginateDemoList,
} from "@/lib/demo-data"

export const fetchFilesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<FileItem>> => {
  try {
    const { data } = await httpClient.get("/files", {
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
    const message = apiErrorMessage(error, "Failed to fetch files")
    console.error("[API Error] fetchFilesApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  return paginateDemoList(
    getDemoFiles(),
    params,
    (file, search) => file.name.toLowerCase().includes(search)
  )
}

export const getFileApi = async (id: string): Promise<FileItem> => {
  try {
    const { data } = await httpClient.get(`/files/${id}`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `File ${id} not found`)
    console.error("[API Error] getFileApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoFiles().find((f) => f.id === id)
      if (found) return found
      throw new Error(`File with ID ${id} not found: ${message}`)
    }
    throw error
  }
}

export const uploadFileApi = async (formData: FormData): Promise<FileItem> => {
  try {
    const { data } = await httpClient.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to upload file")
    console.error("[API Error] uploadFileApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const file = formData.get("file") as File | null
      const demoFile: FileItem = {
        id: `file-demo-${Date.now()}`,
        name: file?.name || "Uploaded_Document.pdf",
        size: file?.size || 1024 * 1024,
        type: FileType.DOCUMENT,
        visibility: FileVisibility.PRIVATE,
        owner: { id: "usr-1", name: "Alex Morgan", email: "alex.morgan@company.io" },
        uploadedAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        starred: false,
      }
      return demoFile
    }
    throw error
  }
}

export const updateFileApi = async (
  id: string,
  payload: Partial<FileItem>
): Promise<FileItem> => {
  try {
    const { data } = await httpClient.patch(`/files/${id}`, payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to update file ${id}`)
    console.error("[API Error] updateFileApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoFiles().find((f) => f.id === id)
      if (!found) throw new Error(`File with ID ${id} not found: ${message}`)
      return { ...found, ...payload, modifiedAt: new Date().toISOString() }
    }
    throw error
  }
}

export const deleteFileApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/files/${id}`)
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to delete file ${id}`)
    console.error("[API Error] deleteFileApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return
    }
    throw error
  }
}

export const renameFileApi = async (
  id: string,
  name: string
): Promise<FileItem> => {
  return updateFileApi(id, { name })
}

export const toggleStarFileApi = async (id: string): Promise<FileItem> => {
  const file = await getFileApi(id)
  return updateFileApi(id, { starred: !file.starred })
}

export const getFileDownloadUrlApi = async (
  id: string
): Promise<{ url: string; filename: string }> => {
  try {
    const { data } = await httpClient.get(`/files/${id}/download`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to get download URL for file ${id}`)
    console.error("[API Error] getFileDownloadUrlApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return { url: "#", filename: "demo-file.pdf" }
    }
    throw error
  }
}

export const fetchFilesSummaryApi = async (): Promise<FileSummary> => {
  try {
    const { data } = await httpClient.get("/files/summary")
    if (data?.data) return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch files summary")
    console.error("[API Error] fetchFilesSummaryApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }
  return getDemoFilesSummary()
}
