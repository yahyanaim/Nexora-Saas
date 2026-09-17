// lib/api/reports-apis.ts

import httpClient from "@/lib/myapi/client"
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

// Content Reports
export const fetchContentReportsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<ContentReport>> => {
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

export const fetchContentReportsStatsApi =
  async (): Promise<ContentReportStats> => {
    const { data } = await httpClient.get("/report-contents/stats")
    return data.data
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
  const { data } = await httpClient.put(`/report-contents/${reportId}/status`, {
    status,
    resolutionNotes,
    actionTaken,
  })
  return data.data
}

// System Issues
export const fetchSystemIssuesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<SystemIssue>> => {
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

export const fetchSystemIssuesStatsApi =
  async (): Promise<SystemIssueStats> => {
    const { data } = await httpClient.get("/report-system-issues/stats")
    return data.data
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
  const { data } = await httpClient.put(
    `/report-system-issues/${issueId}/status`,
    {
      status,
      resolutionNotes,
    }
  )
  return data.data
}
