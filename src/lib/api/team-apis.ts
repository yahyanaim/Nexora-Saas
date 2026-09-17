import apiClient from "@/lib/myapi/client"
import { TeamRole } from "@/types/users"

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  teamRole: TeamRole
  status: "active" | "invited" | "suspended"
  joinedAt: string
  lastActiveAt?: string
}

export interface TeamInvite {
  id: string
  email: string
  teamRole: TeamRole
  invitedBy: string
  invitedAt: string
  expiresAt: string
  status: "pending" | "accepted" | "expired" | "revoked"
}

export interface InviteMemberPayload {
  email: string
  teamRole: TeamRole
}

const STORAGE_TEAM_KEY = "nexora_team_members"
const STORAGE_INVITES_KEY = "nexora_team_invites"

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "usr-demo-1",
    name: "Alex Morgan",
    email: "alex.morgan@company.io",
    avatar: "/avatars/alex-morgan.jpg",
    teamRole: "owner",
    status: "active",
    joinedAt: "2024-01-15T09:00:00Z",
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: "usr-demo-2",
    name: "Sarah Chen",
    email: "sarah.chen@techcorp.com",
    avatar: "/avatars/sarah-chen.jpg",
    teamRole: "admin",
    status: "active",
    joinedAt: "2024-02-10T11:30:00Z",
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "usr-demo-3",
    name: "Marcus Vance",
    email: "marcus.vance@enterprise.org",
    avatar: "/avatars/marcus-vance.jpg",
    teamRole: "member",
    status: "active",
    joinedAt: "2024-03-01T14:15:00Z",
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "usr-demo-4",
    name: "Elena Rostova",
    email: "elena.rostova@designlab.io",
    avatar: "/avatars/elena-rostova.jpg",
    teamRole: "viewer",
    status: "active",
    joinedAt: "2024-03-20T16:45:00Z",
    lastActiveAt: new Date(Date.now() - 172800000).toISOString(),
  },
]

const INITIAL_INVITES: TeamInvite[] = [
  {
    id: "inv-demo-1",
    email: "devops.lead@company.io",
    teamRole: "admin",
    invitedBy: "Alex Morgan",
    invitedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: "pending",
  },
]

function getStoredMembers(): TeamMember[] {
  if (typeof window === "undefined") return INITIAL_TEAM_MEMBERS
  try {
    const raw = localStorage.getItem(STORAGE_TEAM_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return INITIAL_TEAM_MEMBERS
}

function saveStoredMembers(members: TeamMember[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_TEAM_KEY, JSON.stringify(members))
  } catch {}
}

function getStoredInvites(): TeamInvite[] {
  if (typeof window === "undefined") return INITIAL_INVITES
  try {
    const raw = localStorage.getItem(STORAGE_INVITES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return INITIAL_INVITES
}

function saveStoredInvites(invites: TeamInvite[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_INVITES_KEY, JSON.stringify(invites))
  } catch {}
}

/**
 * Fetch all active team members in the organization.
 */
export async function fetchTeamMembersApi(): Promise<TeamMember[]> {
  try {
    const res = await apiClient.get<TeamMember[]>("/team/members")
    if (res?.data && Array.isArray(res.data)) return res.data
  } catch {}
  return getStoredMembers()
}

/**
 * Invite a new member to join the organization with a specified role.
 */
export async function inviteTeamMemberApi(
  payload: InviteMemberPayload
): Promise<TeamInvite> {
  const newInvite: TeamInvite = {
    id: `inv_${Date.now()}`,
    email: payload.email,
    teamRole: payload.teamRole,
    invitedBy: "Alex Morgan",
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: "pending",
  }

  try {
    const res = await apiClient.post<TeamInvite>("/team/invites", payload)
    if (res?.data?.id) return res.data
  } catch {}

  const current = getStoredInvites()
  const updated = [newInvite, ...current]
  saveStoredInvites(updated)
  return newInvite
}

/**
 * Update an existing member's organization role.
 */
export async function updateTeamMemberRoleApi(
  userId: string,
  teamRole: TeamRole
): Promise<TeamMember> {
  try {
    const res = await apiClient.patch<TeamMember>(`/team/members/${userId}`, {
      teamRole,
    })
    if (res?.data) return res.data
  } catch {}

  const current = getStoredMembers()
  const member = current.find((m) => m.id === userId)
  if (!member) {
    throw new Error("Team member not found")
  }
  const updatedMember = { ...member, teamRole }
  const updated = current.map((m) => (m.id === userId ? updatedMember : m))
  saveStoredMembers(updated)
  return updatedMember
}

/**
 * Remove a member from the organization.
 */
export async function removeTeamMemberApi(
  userId: string
): Promise<{ success: boolean }> {
  try {
    await apiClient.delete(`/team/members/${userId}`)
  } catch {}

  const current = getStoredMembers()
  const updated = current.filter((m) => m.id !== userId)
  saveStoredMembers(updated)
  return { success: true }
}

/**
 * Fetch all pending pending invites for the organization.
 */
export async function fetchPendingInvitesApi(): Promise<TeamInvite[]> {
  try {
    const res = await apiClient.get<TeamInvite[]>("/team/invites")
    if (res?.data && Array.isArray(res.data)) return res.data
  } catch {}
  return getStoredInvites()
}

/**
 * Cancel or revoke a pending invitation.
 */
export async function cancelPendingInviteApi(
  inviteId: string
): Promise<{ success: boolean }> {
  try {
    await apiClient.delete(`/team/invites/${inviteId}`)
  } catch {}

  const current = getStoredInvites()
  const updated = current.filter((i) => i.id !== inviteId)
  saveStoredInvites(updated)
  return { success: true }
}
