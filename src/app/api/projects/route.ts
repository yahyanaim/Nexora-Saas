// app/api/projects/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ProjectStatus } from "@/types/projects"
import {
  errorResponse,
  successResponse,
  successPaginatedResponse,
  formatDocuments,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"
import Project from "@/lib/models/project-model"
import { Types } from "mongoose"

// GET /api/projects - List projects
export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const { searchParams } = new URL(req.url)

      const query: QueryDto = {
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page")!)
          : 0,
        pageSize: searchParams.get("pageSize")
          ? parseInt(searchParams.get("pageSize")!)
          : 10,
        search: searchParams.get("search") || undefined,
        sort: searchParams.get("sort")
          ? JSON.parse(searchParams.get("sort")!)
          : undefined,
        filter: JSON.parse(searchParams.get("filter") || "[]"),
      }

      const result = await aggregateQuery({
        query,
        options: {
          model: Project,
          allowedSearchFields: ["name", "description"],
          allowedFilterFields: ["status", "owner"],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
              },
            },
            {
              $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "members.user",
                foreignField: "_id",
                as: "membersData",
              },
            },
            {
              $project: {
                name: 1,
                updatedAt: 1,
                createdAt: 1,
                description: 1,
                status: 1,
                progress: 1,
                owner: {
                  id: "$owner._id",
                  name: "$owner.name",
                  email: "$owner.email",
                  avatar: "$owner.avatar",
                  profileColor: "$owner.profileColor",
                },
                members: {
                  $map: {
                    input: "$members",
                    as: "member",
                    in: {
                      id: "$$member._id",
                      role: "$$member.role",
                      user: {
                        $let: {
                          vars: {
                            matchedUser: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$membersData",
                                    as: "u",
                                    cond: { $eq: ["$$u._id", "$$member.user"] },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: {
                            id: "$$matchedUser._id",
                            name: "$$matchedUser.name",
                            email: "$$matchedUser.email",
                            avatar: "$$matchedUser.avatar",
                            profileColor: "$$matchedUser.profileColor",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      })

      const formattedProjects = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedProjects,
        pagination: result.pagination,
        message: "Projects fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_READ],
  }
)

// POST /api/projects - Create project
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const {
        name,
        description,
        status,
        owner,
        members = [],
        startDate,
        endDate,
      } = body

      if (!name || !owner) {
        return errorResponse({
          message: "Project name and owner are required",
          status: 400,
        })
      }

      await connectDB()

      // Dedupe member ids and exclude the owner (owner is added separately below)
      const uniqueMemberIds = Array.from(
        new Set(
          (members as string[]).filter(Boolean).map((id) => id.toString())
        )
      ).filter((id) => id !== owner.toString())

      // Build members array with owner included
      const buildMembers: any = [
        { user: new Types.ObjectId(owner), role: "OWNER" },
        ...uniqueMemberIds.map((id: string) => ({
          user: new Types.ObjectId(id),
          role: "MEMBER",
        })),
      ]

      const project = await Project.create({
        name,
        description: description || "",
        status: status || ProjectStatus.ACTIVE,
        owner: new Types.ObjectId(owner),
        members: buildMembers,
        startDate: startDate || new Date(),
        endDate: endDate || null,
        progress: 0,
        tasks: [],
        files: [],
        activities: [
          {
            user: new Types.ObjectId(owner),
            action: "created",
            description: `Project "${name}" was created`,
          },
        ],
      })

      const populatedProject: any = await Project.findById(project._id)
        .populate("owner", "name email profileColor avatar")
        .populate("members.user", "name email profileColor avatar")
        .lean()
        .exec()

      const formattedProject = {
        id: populatedProject._id.toString(),
        name: populatedProject.name,
        description: populatedProject.description,
        status: populatedProject.status,
        owner: {
          id: populatedProject.owner._id.toString(),
          name: populatedProject.owner.name,
          email: populatedProject.owner.email,
          avatar: populatedProject.owner.avatar,
          profileColor: populatedProject.owner.profileColor,
        },
        members: populatedProject.members.map((m: any) => ({
          id: m._id.toString(),
          user: {
            id: m.user._id.toString(),
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            profileColor: m.user.profileColor,
          },
          role: m.role,
        })),
        tasks: [],
        files: [],
        activities: populatedProject.activities || [],
        progress: populatedProject.progress,
        startDate: populatedProject.startDate,
        endDate: populatedProject.endDate,
        createdAt: populatedProject.createdAt,
        updatedAt: populatedProject.updatedAt,
      }

      return successResponse({
        data: formattedProject,
        status: 201,
        message: "Project created successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PROJECTS_CREATE],
  }
)
