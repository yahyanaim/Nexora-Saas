// lib/helpers/user-helpers.ts

import { IUser } from "@/lib/models/user-model"
import { UserType } from "@/types/users"

export function canManageUser(
  authUser: any,
  targetUserId: string,
  requireAdmin = false
): boolean {
  const userId = authUser._id?.toString() || authUser.id
  const isSelf = userId === targetUserId
  const isAdmin = authUser.userType === UserType.ADMIN
  if (requireAdmin) return isAdmin
  return isAdmin || isSelf
}

export function formatUserResponse(user: any) {
  if (!user) return null

  const userObj = user.toObject ? user.toObject() : { ...user }

  let rolesData = []
  if (userObj.roles && Array.isArray(userObj.roles)) {
    rolesData = userObj.roles.map((role: any) => {
      const roleObj = role.toObject ? role.toObject() : { ...role }
      return {
        id: roleObj._id?.toString() || roleObj.id,
        name: roleObj.name,
        permissions: roleObj.permissions,
        status: roleObj.status,
        createdAt: roleObj.createdAt,
        updatedAt: roleObj.updatedAt,
      }
    })
  }

  return {
    id: userObj._id?.toString() || userObj.id,
    name: userObj.name,
    email: userObj.email,
    username: userObj.username,
    avatar: userObj.avatar,
    cover: userObj.cover,
    profileColor: userObj.profileColor,
    userType: userObj.userType,
    status: userObj.status,
    roles: rolesData,
    bio: userObj.bio,
    is2FA: userObj.is2FA,
    isPasscodeLocked: userObj.isPasscodeLocked,
    dateOfBirth: userObj.dateOfBirth,
    lastLoginAt: userObj.lastLoginAt,
    lastSeenAt: userObj.lastSeenAt,
    createdAt: userObj.createdAt,
    updatedAt: userObj.updatedAt,
  }
}
