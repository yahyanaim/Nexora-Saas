// lib/api/files-api.ts

import httpClient from "@/lib/myapi/client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type { FileItem, FileSummary } from "@/types/files"
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
  } catch {
    // Fallback to demo files
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
  } catch {
    return getDemoFiles().find((f) => f.id === id) || getDemoFiles()[0]!
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
  } catch {
    return getDemoFiles()[0]!
  }
}

export const updateFileApi = async (
  id: string,
  payload: Partial<FileItem>
): Promise<FileItem> => {
  try {
    const { data } = await httpClient.patch(`/files/${id}`, payload)
    return data.data
  } catch {
    const found = getDemoFiles().find((f) => f.id === id)
    return found ? { ...found, ...payload } : getDemoFiles()[0]!
  }
}

export const deleteFileApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/files/${id}`)
  } catch {
    // Demo deletion ok
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
  } catch {
    return { url: "#", filename: "demo-file.pdf" }
  }
}

export const fetchFilesSummaryApi = async (): Promise<FileSummary> => {
  try {
    const { data } = await httpClient.get("/files/summary")
    if (data?.data) return data.data
  } catch {
    // Fallback to demo summary
  }
  return getDemoFilesSummary()
}
