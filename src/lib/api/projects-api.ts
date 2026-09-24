// lib/api/projects-api.ts

import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import {
  ProjectStatus,
  type Project,
  type CreateProjectPayload,
  type UpdateProjectPayload,
  type ProjectsSummary,
} from "@/types/projects"
import {
  getDemoProjects,
  addDemoProject,
  deleteDemoProject,
  paginateDemoList,
} from "@/lib/demo-data"

export const fetchProjectsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Project>> => {
  try {
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

    if (data?.data) {
      return {
        success: data.success ?? true,
        data: data.data.items || [],
        pagination: {
          totalItems: data.data.total || 0,
          page: data.data.page || 0,
          pageSize: data.data.pageSize || 10,
          totalPages: data.data.totalPages || 1,
          hasNextPage: !!data.data.hasNextPage,
          hasPrevPage: !!data.data.hasPrevPage,
        },
      }
    }
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch projects")
    console.error("[API Error] fetchProjectsApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  return paginateDemoList(
    getDemoProjects(),
    params,
    (p, search) =>
      p.name.toLowerCase().includes(search) ||
      (p.description?.toLowerCase().includes(search) ?? false)
  )
}

export const getProjectApi = async (id: string): Promise<Project> => {
  try {
    const { data } = await httpClient.get(`/projects/${id}`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Project ${id} not found`)
    console.error("[API Error] getProjectApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoProjects().find((p) => p.id === id)
      if (found) return found
      throw new Error(`Project with ID ${id} not found: ${message}`)
    }
    throw error
  }
}

export const createProjectApi = async (
  payload: CreateProjectPayload
): Promise<Project> => {
  try {
    const { data } = await httpClient.post("/projects", payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to create project")
    console.error("[API Error] createProjectApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return addDemoProject(payload)
    }
    throw error
  }
}

export const updateProjectApi = async (
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> => {
  try {
    const { data } = await httpClient.patch(`/projects/${id}`, payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to update project ${id}`)
    console.error("[API Error] updateProjectApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoProjects().find((p) => p.id === id)
      if (!found) throw new Error(`Project with ID ${id} not found: ${message}`)
      return {
        ...found,
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.startDate ? { startDate: payload.startDate } : {}),
        ...(payload.endDate !== undefined ? { endDate: payload.endDate } : {}),
        updatedAt: new Date().toISOString(),
      }
    }
    throw error
  }
}

export const deleteProjectApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/projects/${id}`)
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to delete project ${id}`)
    console.error("[API Error] deleteProjectApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      deleteDemoProject(id)
      return
    }
    throw error
  }
}

export const archiveProjectApi = async (id: string): Promise<Project> => {
  try {
    const { data } = await httpClient.post(`/projects/${id}/archive`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to archive project ${id}`)
    console.error("[API Error] archiveProjectApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return updateProjectApi(id, { status: ProjectStatus.ARCHIVED })
    }
    throw error
  }
}

export const fetchProjectsSummaryApi = async (): Promise<ProjectsSummary> => {
  try {
    const { data } = await httpClient.get("/projects/summary")
    if (data?.data) return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch projects summary")
    console.error("[API Error] fetchProjectsSummaryApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  const projects = getDemoProjects()
  const total = projects.length
  const active = projects.filter((p) => p.status === ProjectStatus.ACTIVE).length
  const archived = projects.filter((p) => p.status === ProjectStatus.ARCHIVED).length
  const completed = projects.filter((p) => p.status === ProjectStatus.COMPLETED).length
  const onHold = projects.filter((p) => p.status === ProjectStatus.ON_HOLD).length
  const totalMembers = projects.reduce((acc, p) => acc + (p.members?.length || 0), 0)
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0)
  const completedTasks = projects.reduce(
    (acc, p) => acc + (p.tasks?.filter((t) => t.status === "done").length || 0),
    0
  )
  const avgProgress = total > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total) : 0

  return {
    total,
    active,
    archived,
    completed,
    onHold,
    totalMembers,
    totalTasks,
    completedTasks,
    avgProgress,
  }
}
