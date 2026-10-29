export interface PendingAction {
  id: string
  type: "report" | "message" | "user"
  title: string
  description: string
  count: number
  createdAt: string
}
