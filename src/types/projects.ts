// types/projects.ts

export enum ProjectStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  COMPLETED = "completed",
  ON_HOLD = "on_hold",
}

export interface ProjectMember {
  id: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string | null
    profileColor?: string
  }
  role: "OWNER" | "MEMBER" | "VIEWER"
}

export interface ProjectTask {
  id: string
  title: string
  status: "todo" | "in_progress" | "done"
  assignee?: {
    id: string
    name: string
    avatar?: string | null
  }
  dueDate?: string
}

export interface ProjectFile {
  id: string
  name: string
  size: number
  uploadedBy: {
    id: string
    name: string
    avatar?: string | null
    profileColor?: string
  }
  uploadedAt: string
}

export interface ProjectActivity {
  id: string
  user: {
    id: string
    name: string
    avatar?: string | null
    profileColor?: string
  }
  action: string
  description: string
  timestamp: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  owner: {
    id: string
    name: string
    email: string
    avatar?: string | null
    profileColor?: string
  }
  members: ProjectMember[]
  tasks: ProjectTask[]
  files: ProjectFile[]
  activities: ProjectActivity[]
  progress: number
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  name: string
  description?: string
  status?: ProjectStatus
  owner: string
  members?: string[]
  startDate: string
  endDate?: string
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>

export interface ProjectsSummary {
  total: number
  active: number
  archived: number
  completed: number
  onHold: number
  totalMembers: number
  totalTasks: number
  completedTasks: number
  avgProgress: number
}
