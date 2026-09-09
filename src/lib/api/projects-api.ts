// lib/api/projects-api.ts

import httpClient from "./http-client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectsSummary,
} from "@/types/projects"

export const fetchProjectsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Project>> => {
  const { data } = await httpClient.get("/projects", {
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

export const getProjectApi = async (id: string): Promise<Project> => {
  const { data } = await httpClient.get(`/projects/${id}`)
  return data.data
}

export const createProjectApi = async (
  payload: CreateProjectPayload
): Promise<Project> => {
  const { data } = await httpClient.post("/projects", payload)
  return data.data
}

export const updateProjectApi = async (
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> => {
  const { data } = await httpClient.patch(`/projects/${id}`, payload)
  return data.data
}

export const deleteProjectApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/projects/${id}`)
  return data
}

export const archiveProjectApi = async (id: string): Promise<Project> => {
  const { data } = await httpClient.post(`/projects/${id}/archive`)
  return data.data
}

export const fetchProjectsSummaryApi = async (): Promise<ProjectsSummary> => {
  const { data } = await httpClient.get("/projects/summary")
  return data.data
}
