import httpClient from "@/lib/myapi/client"
import {
  ActivityRange,
  ActivityItem,
  LiveCall,
  OverviewStats,
  PendingAction,
  ActivityPoint,
} from "@/types/overview"
import {
  DEMO_OVERVIEW_STATS,
  DEMO_ACTIVITY_7D,
  DEMO_ACTIVITY_30D,
  DEMO_PENDING_ACTIONS,
  DEMO_RECENT_ACTIVITY,
  DEMO_LIVE_CALLS,
} from "@/lib/demo-data"

export const fetchOverviewStatsApi = async (): Promise<OverviewStats> => {
  try {
    const { data } = await httpClient.get("/overview/stats")
    if (data?.content) return data.content
  } catch {
    // Fallback to demo stats
  }
  return DEMO_OVERVIEW_STATS
}

export const fetchPlatformActivityApi = async (
  range: ActivityRange
): Promise<ActivityPoint[]> => {
  try {
    const { data } = await httpClient.get("/overview/activity", {
      params: { range },
    })
    if (data?.content) return data.content
  } catch {
    // Fallback to demo activity points
  }
  return range === "30d" ? DEMO_ACTIVITY_30D : DEMO_ACTIVITY_7D
}

export const fetchPendingActionsApi = async (): Promise<PendingAction[]> => {
  try {
    const { data } = await httpClient.get("/overview/pending-actions")
    if (data?.content) return data.content
  } catch {
    // Fallback to demo pending actions
  }
  return DEMO_PENDING_ACTIONS
}

export const fetchRecentActivityApi = async (
  limit = 10
): Promise<ActivityItem[]> => {
  try {
    const { data } = await httpClient.get("/overview/recent-activity", {
      params: { limit },
    })
    if (data?.content) return data.content
  } catch {
    // Fallback to demo recent activity
  }
  return DEMO_RECENT_ACTIVITY.slice(0, limit)
}

export const fetchLiveCallsApi = async (limit = 5): Promise<LiveCall[]> => {
  try {
    const { data } = await httpClient.get("/overview/live-calls", {
      params: { limit },
    })
    if (data?.content) return data.content
  } catch {
    // Fallback to demo live calls
  }
  return DEMO_LIVE_CALLS.slice(0, limit)
}
