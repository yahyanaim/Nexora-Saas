import { Types } from "mongoose"

export interface QueryDto {
  filter?: Record<string, any> | any[]
  page?: number
  pageSize?: number
  search?: string
  sort?: Record<string, 1 | -1>
}

export interface AggregatePaginationOptions {
  model: any
  pipelines?: any[]
  allowedSearchFields?: string[]
  allowedFilterFields?: string[]
  excludeFilterValue?: Record<string, any | any[]>
  sort?: Record<string, 1 | -1>
  notIncludeFields?: string[]
  includeFields?: string[]
  cleanResponse?: boolean
}

export interface AggregateQueryResult<T = any> {
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  items: T[]
}

const tryConvertToObjectId = (value: any) => {
  if (Array.isArray(value)) {
    return value.map((v) =>
      Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v
    )
  }
  if (Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value)
  }
  return value
}

export async function aggregateQuery<T = any>({
  options,
  query,
}: {
  options: AggregatePaginationOptions
  query: QueryDto
}): Promise<AggregateQueryResult<T>> {
  const {
    model,
    pipelines = [],
    allowedSearchFields = [],
    allowedFilterFields = [],
    excludeFilterValue = {},
    sort = { createdAt: -1 },
    notIncludeFields = [],
    includeFields = [],
    cleanResponse = true,
  } = options

  const {
    filter = {},
    page = 0,
    pageSize = 10,
    search,
    sort: querySort,
  } = query

  const safePage = Math.max(page, 0)
  const safeLimit = Math.max(pageSize, 1)
  const skip = safePage * safeLimit

  const finalSort =
    querySort && Object.keys(querySort).length ? querySort : sort

  const matchStage: any = {}

  for (const key in excludeFilterValue) {
    matchStage[key] = {
      $nin: Array.isArray(excludeFilterValue[key])
        ? excludeFilterValue[key]
        : [excludeFilterValue[key]],
    }
  }

  if (filter && !Array.isArray(filter) && allowedFilterFields.length) {
    for (const key in filter) {
      if (!allowedFilterFields.includes(key)) continue
      matchStage[key] = {
        ...(matchStage[key] || {}),
        ...(Array.isArray(filter[key])
          ? { $in: tryConvertToObjectId(filter[key]) }
          : { $eq: tryConvertToObjectId(filter[key]) }),
      }
    }
  }

  if (filter && Array.isArray(filter) && allowedFilterFields.length) {
    filter.forEach((f: any) => {
      const { field, operator, value } = f
      if (!allowedFilterFields.includes(field)) return

      switch (operator) {
        case "contains":
          matchStage[field] = { $regex: value, $options: "i" }
          break
        case "eq":
          matchStage[field] = tryConvertToObjectId(value)
          break
        case "in":
          matchStage[field] = {
            $in: tryConvertToObjectId(Array.isArray(value) ? value : [value]),
          }
          break
        case "nin":
          matchStage[field] = {
            $nin: tryConvertToObjectId(Array.isArray(value) ? value : [value]),
          }
          break
        case "gt":
          matchStage[field] = { $gt: value }
          break
        case "lt":
          matchStage[field] = { $lt: value }
          break
        case "gte":
          matchStage[field] = { $gte: value }
          break
        case "lte":
          matchStage[field] = { $lte: value }
          break
      }
    })
  }

  if (search && allowedSearchFields.length) {
    matchStage["$or"] = allowedSearchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }))
  }

  let projectStage: any = null

  if (cleanResponse) {
    const excludeFields = [...notIncludeFields, "_id", "__v"]
    projectStage = {
      $project: Object.fromEntries(excludeFields.map((f) => [f, 0])),
    }
  } else if (includeFields.length > 0) {
    projectStage = {
      $project: Object.fromEntries(includeFields.map((f) => [f, 1])),
    }
  } else if (notIncludeFields.length > 0) {
    projectStage = {
      $project: Object.fromEntries(notIncludeFields.map((f) => [f, 0])),
    }
  }

  const aggregation: any[] = [{ $match: matchStage }, ...(pipelines || [])]

  if (cleanResponse) {
    aggregation.push({
      $addFields: {
        id: "$_id",
      },
    })

    const excludeFields = [...notIncludeFields, "_id", "__v"]
    aggregation.push({
      $project: Object.fromEntries(excludeFields.map((f) => [f, 0])),
    })
  } else if (projectStage) {
    aggregation.push(projectStage)
  }

  aggregation.push({ $sort: finalSort })

  aggregation.push({
    $facet: {
      items: [{ $skip: skip }, { $limit: safeLimit }],
      meta: [{ $count: "totalItems" }],
    },
  })

  const result = await model.aggregate(aggregation)
  let items = result[0]?.items ?? []
  const totalItems = result[0]?.meta?.[0]?.totalItems ?? 0

  if (cleanResponse && items.length > 0) {
    items = items.map((item: any) => {
      if (item.roles && Array.isArray(item.roles)) {
        item.roles = item.roles.map((role: any) => {
          const cleanedRole = { ...role }

          delete cleanedRole._id
          delete cleanedRole.__v

          if (role._id) {
            cleanedRole.id = role._id.toString()
          }
          return cleanedRole
        })
      }
      return item
    })
  }

  return {
    pagination: {
      page: safePage,
      pageSize: safeLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / safeLimit),
      hasNextPage: safePage + 1 < Math.ceil(totalItems / safeLimit),
      hasPrevPage: safePage > 0,
    },
    items,
  }
}

export const emptyAggregateQuery: AggregateQueryResult = {
  pagination: {
    page: 0,
    pageSize: 0,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  items: [],
}
