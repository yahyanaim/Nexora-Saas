// lib/api/reports-apis.ts

import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import type {
  ApiPaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import type {
  ContentReport,
  ContentReportStats,
  ReportStatus,
  SystemIssue,
  SystemIssueStats,
  IssueStatus,
} from "@/types/reports"
import { paginateDemoList } from "@/lib/demo-data"
import {
  getDemoContentReports,
  getDemoContentReportsStats,
  updateDemoContentReportStatus,
  getDemoSystemIssues,
  getDemoSystemIssuesStats,
  updateDemoSystemIssueStatus,
} from "@/lib/demo-data/reports"

// Content Reports
export const fetchContentReportsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<ContentReport>> => {
  try {
    const { data } = await httpClient.get("/report-contents", {
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
    const msg = apiErrorMessage(error, "Failed to fetch content reports")
    console.error("fetchContentReportsApi error:", msg)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(msg)
    }
  }

  return paginateDemoList(
    getDemoContentReports(),
    params,
    (report, search) =>
      report.reporterName.toLowerCase().includes(search) ||
      report.targetName.toLowerCase().includes(search) ||
      report.reason.toLowerCase().includes(search) ||
      (report.description?.toLowerCase().includes(search) ?? false)
  )
}

export const fetchContentReportsStatsApi =
  async (): Promise<ContentReportStats> => {
    try {
      const { data } = await httpClient.get("/report-contents/stats")
      if (data?.data) {
        return data.data
      }
    } catch (error) {
      const msg = apiErrorMessage(error, "Failed to fetch content reports stats")
      console.error("fetchContentReportsStatsApi error:", msg)
      if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
        throw new Error(msg)
      }
    }
    return getDemoContentReportsStats()
  }

export const updateContentReportStatusApi = async ({
  reportId,
  status,
  resolutionNotes,
  actionTaken,
}: {
  reportId: string
  status: ReportStatus
  resolutionNotes?: string
  actionTaken?: string
}): Promise<ContentReport> => {
  try {
    const { data } = await httpClient.put(`/report-contents/${reportId}/status`, {
      status,
      resolutionNotes,
      actionTaken,
    })
    if (data?.data) {
      return data.data
    }
  } catch (error) {
    const msg = apiErrorMessage(error, "Failed to update content report status")
    console.error("updateContentReportStatusApi error:", msg)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(msg)
    }
  }
  return updateDemoContentReportStatus(reportId, status, resolutionNotes, actionTaken)
}

// System Issues
export const fetchSystemIssuesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<SystemIssue>> => {
  try {
    const { data } = await httpClient.get("/report-system-issues", {
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
    const msg = apiErrorMessage(error, "Failed to fetch system issues")
    console.error("fetchSystemIssuesApi error:", msg)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(msg)
    }
  }

  return paginateDemoList(
    getDemoSystemIssues(),
    params,
    (issue, search) =>
      issue.title.toLowerCase().includes(search) ||
      issue.category.toLowerCase().includes(search) ||
      issue.priority.toLowerCase().includes(search) ||
      issue.status.toLowerCase().includes(search) ||
      (issue.assignedToName?.toLowerCase().includes(search) ?? false) ||
      issue.reportedByName.toLowerCase().includes(search) ||
      issue.description.toLowerCase().includes(search)
  )
}

export const fetchSystemIssuesStatsApi =
  async (): Promise<SystemIssueStats> => {
    try {
      const { data } = await httpClient.get("/report-system-issues/stats")
      if (data?.data) {
        return data.data
      }
    } catch (error) {
      const msg = apiErrorMessage(error, "Failed to fetch system issues stats")
      console.error("fetchSystemIssuesStatsApi error:", msg)
      if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
        throw new Error(msg)
      }
    }
    return getDemoSystemIssuesStats()
  }

export const updateSystemIssueStatusApi = async ({
  issueId,
  status,
  resolutionNotes,
}: {
  issueId: string
  status: IssueStatus
  resolutionNotes?: string
}): Promise<SystemIssue> => {
  try {
    const { data } = await httpClient.put(
      `/report-system-issues/${issueId}/status`,
      {
        status,
        resolutionNotes,
      }
    )
    if (data?.data) {
      return data.data
    }
  } catch (error) {
    const msg = apiErrorMessage(error, "Failed to update system issue status")
    console.error("updateSystemIssueStatusApi error:", msg)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(msg)
    }
  }
  return updateDemoSystemIssueStatus(issueId, status, resolutionNotes)
}
