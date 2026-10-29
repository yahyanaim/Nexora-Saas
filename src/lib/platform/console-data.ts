import { UserStatus, UserType, type User } from "@/types/users"
import { NEXORA_CUSTOMERS, NEXORA_TEAM } from "./nexora-catalog"

/**
 * Turns the Nexora catalogue into the user records the platform console pages
 * show (staff and customer accounts), with dates relative to today so the
 * demo always looks current.
 */

const COLORS = ["#2684ff", "#1baf7a", "#eb6834", "#8a3ffc", "#eda100", "#da1e28"]
const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => {
  const d = new Date()
  d.setUTCHours(9, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}
const addMonths = (d: Date, n: number) => {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}

export function consoleUsers(): User[] {
  const users: User[] = []
  NEXORA_TEAM.forEach((m, i) => {
    users.push({
      id: `usr-nx-${i + 1}`, name: m.name, email: m.email, role: "admin", userType: UserType.STAFF, status: UserStatus.ACTIVE, isActive: true, isVerified: true,
      avatar: m.avatar, profileColor: COLORS[i % COLORS.length], adminTag: m.role, adminTagColor: "#2684ff", orgId: "nexora", createdAt: iso(daysAgo(700 - i * 90)), updatedAt: iso(daysAgo(2)),
    })
  })
  NEXORA_CUSTOMERS.forEach((c, ci) => {
    const since = new Date(`${c.since}T09:00:00Z`)
    const cancelled = c.status === "cancelled"
    users.push({
      id: c.id === "cus_atlas" ? "usr-demo-1" : `usr-${c.id}-admin`, name: c.admin.name, email: c.admin.email, role: "admin", userType: UserType.ADMIN,
      status: cancelled ? UserStatus.INACTIVE : UserStatus.ACTIVE, isActive: !cancelled, isVerified: true, avatar: c.admin.avatar, profileColor: COLORS[ci % COLORS.length],
      adminTag: c.name, orgId: c.id, teamRole: "owner", createdAt: iso(since), updatedAt: iso(daysAgo(ci + 1)), lastSeen: iso(daysAgo(cancelled ? 60 : ci)),
    })
    c.members.forEach((m, mi) => {
      users.push({
        id: `usr-${c.id}-${mi + 1}`, name: m.name, email: m.email, role: "user", userType: UserType.USER,
        status: m.banned ? UserStatus.BANNED : cancelled ? UserStatus.INACTIVE : UserStatus.ACTIVE, isActive: !m.banned && !cancelled, isBanned: !!m.banned, isVerified: !m.banned,
        avatar: m.avatar, profileColor: COLORS[(ci + mi + 1) % COLORS.length], adminTag: c.name, orgId: c.id, teamRole: "member",
        createdAt: iso(addMonths(since, mi + 1)), updatedAt: iso(daysAgo(ci + mi + 2)), lastSeen: iso(daysAgo(ci + mi + 1)),
        ...(m.banned ? { bio: "Banned: automated sign-ups from a disposable address" } : {}),
      })
    })
  })
  return users
}

