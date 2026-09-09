import httpClient from "./http-client"
import {
  ActivityRange,
  ActivityItem,
  LiveCall,
  OverviewStats,
  PendingAction,
  ActivityPoint,
} from "@/types/overview"

export const fetchOverviewStatsApi = async (): Promise<OverviewStats> => {
  const { data } = await httpClient.get("/overview/stats")
  return data?.content
}

export const fetchPlatformActivityApi = async (
  range: ActivityRange
): Promise<ActivityPoint[]> => {
  const { data } = await httpClient.get("/overview/activity", {
    params: { range },
  })
  return data?.content
}

export const fetchPendingActionsApi = async (): Promise<PendingAction[]> => {
  const { data } = await httpClient.get("/overview/pending-actions")
  return data?.content
}

export const fetchRecentActivityApi = async (
  limit = 10
): Promise<ActivityItem[]> => {
  const { data } = await httpClient.get("/overview/recent-activity", {
    params: { limit },
  })
  return data?.content
}

export const fetchLiveCallsApi = async (limit = 5): Promise<LiveCall[]> => {
  const { data } = await httpClient.get("/overview/live-calls", {
    params: { limit },
  })
  return data?.content
}
