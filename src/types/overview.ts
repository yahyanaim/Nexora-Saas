export type ActivityRange = "7d" | "30d"

export interface PlatformStat {
  title: string
  value: number
  change: number
  icon?: string
}

export interface OverviewStats {
  users: number
  messages: number
  groups: number
  channels: number
  calls: number
  [key: string]: number
}

export interface ActivityPoint {
  label: string
  count: number
}

export interface PendingAction {
  id: string
  type: "report" | "message" | "user"
  title: string
  description: string
  count: number
  createdAt: string
}

export interface ActivityItem {
  type:
    | "user_joined"
    | "group_created"
    | "channel_created"
    | "community_created"
  title: string
  subtitle: string
  createdAt: string
}

export interface LiveCall {
  id: string
  label: string
  spaceName?: string
  participants: string
  startedAt: string
}
