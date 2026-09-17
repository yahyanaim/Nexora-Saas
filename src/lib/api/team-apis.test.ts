import { describe, it, expect } from "vitest"
import {
  fetchTeamMembersApi,
  inviteTeamMemberApi,
  updateTeamMemberRoleApi,
  fetchPendingInvitesApi,
  removeTeamMemberApi,
} from "./team-apis"

describe("team-apis", () => {
  it("fetches team members", async () => {
    const members = await fetchTeamMembersApi()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
    expect(members[0]).toHaveProperty("teamRole")
  })

  it("invites a new member to the organization", async () => {
    const invite = await inviteTeamMemberApi({
      email: "new.hire@enterprise.io",
      teamRole: "member",
    })
    expect(invite).toBeDefined()
    expect(invite.email).toBe("new.hire@enterprise.io")
    expect(invite.teamRole).toBe("member")
    expect(invite.status).toBe("pending")
  })

  it("updates a member role", async () => {
    const updated = await updateTeamMemberRoleApi("usr-demo-3", "admin")
    expect(updated.teamRole).toBe("admin")
  })

  it("fetches pending invites", async () => {
    const invites = await fetchPendingInvitesApi()
    expect(Array.isArray(invites)).toBe(true)
  })

  it("removes a team member", async () => {
    const res = await removeTeamMemberApi("usr-demo-4")
    expect(res.success).toBe(true)
  })
})
