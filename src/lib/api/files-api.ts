// lib/api/files-api.ts

import httpClient from "./http-client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type { FileItem, FileSummary } from "@/types/files"

export const fetchFilesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<FileItem>> => {
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

export const getFileApi = async (id: string): Promise<FileItem> => {
  const { data } = await httpClient.get(`/files/${id}`)
  return data.data
}

export const uploadFileApi = async (formData: FormData): Promise<FileItem> => {
  const { data } = await httpClient.post("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return data.data
}

export const updateFileApi = async (
  id: string,
  payload: any
): Promise<FileItem> => {
  const { data } = await httpClient.patch(`/files/${id}`, payload)
  return data.data
}

export const deleteFileApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/files/${id}`)
  return data
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
  const { data } = await httpClient.get(`/files/${id}/download`)
  return data.data
}

export const fetchFilesSummaryApi = async (): Promise<FileSummary> => {
  const { data } = await httpClient.get("/files/summary")
  return data.data
}
