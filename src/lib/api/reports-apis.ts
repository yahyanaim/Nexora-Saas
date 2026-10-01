// lib/api/reports-apis.ts

import httpClient, { apiErrorMessage, shouldUseDemoFallback } from "@/lib/myapi/client"
import { isDemoMode } from "@/lib/auth/demo-mode"
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
import { logger } from "@/lib/logger"

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

    if (data?.data && Array.isArray(data.data) && (data.data.length > 0 || !isDemoMode())) {
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
    logger.error("fetchContentReportsApi error:", msg)
    if (!shouldUseDemoFallback(error)) {
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
      logger.error("fetchContentReportsStatsApi error:", msg)
      if (!shouldUseDemoFallback(error)) {
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
    logger.error("updateContentReportStatusApi error:", msg)
    if (!shouldUseDemoFallback(error)) {
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

    if (data?.data && Array.isArray(data.data) && (data.data.length > 0 || !isDemoMode())) {
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
    logger.error("fetchSystemIssuesApi error:", msg)
    if (!shouldUseDemoFallback(error)) {
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
      logger.error("fetchSystemIssuesStatsApi error:", msg)
      if (!shouldUseDemoFallback(error)) {
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
    logger.error("updateSystemIssueStatusApi error:", msg)
    if (!shouldUseDemoFallback(error)) {
      throw new Error(msg)
    }
  }
  return updateDemoSystemIssueStatus(issueId, status, resolutionNotes)
}
