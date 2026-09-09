import { NextResponse } from "next/server"

interface SuccessResponseParams<T> {
  data: T
  status?: number
  message?: string
}
interface PaginationParams {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface SuccessPaginatedResponseParams<T> {
  data: T[]
  pagination: PaginationParams
  status?: number
  message?: string
}
interface ErrorResponseParams {
  message: string
  status?: number
  code?: string
}
interface ApiCreatedParams<T> {
  data: T
  message?: string
  status?: number
}
interface ApiUpdatedParams<T> {
  data: T
  message?: string
  status?: number
}
interface ApiDeletedParams {
  message?: string
  status?: number
}
export function cleanResponse<T extends Record<string, any>>(
  obj: T
): T & { id?: string } {
  if (!obj || typeof obj !== "object") return obj as any

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanResponse(item)) as any
  }

  const plain = obj.toObject ? obj.toObject() : { ...obj }

  const result: any = {}

  for (const key of Object.keys(plain)) {
    const value = plain[key]

    if (
      key === "_id" ||
      key === "__v" ||
      key === "password" ||
      key === "passcodeLock" ||
      key === "resetPasswordToken"
    ) {
      continue
    }

    if (key === "id") {
      result.id = value?.toString() || value
      continue
    }

    if (value && typeof value === "object") {
      if (value._id !== undefined) {
        result[key] = cleanResponse(value)
      } else if (Array.isArray(value)) {
        result[key] = value.map((item: any) =>
          item && typeof item === "object" ? cleanResponse(item) : item
        )
      } else if (Object.keys(value).length > 0) {
        result[key] = cleanResponse(value)
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }

  return result
}

export function formatDocument<T extends Record<string, any>>(
  doc: T
): T & { id: string } {
  if (!doc) return doc as any

  const plain = doc.toObject ? doc.toObject() : { ...doc }

  const id = plain._id?.toString() || plain.id

  const cleaned = cleanResponse(plain)

  return {
    ...cleaned,
    id,
  } as any
}

export function formatDocuments<T extends Record<string, any>>(
  docs: T[]
): (T & { id: string })[] {
  if (!docs || !Array.isArray(docs)) return docs as any
  return docs.map((doc) => formatDocument(doc))
}

export function formatResponse<T>(data: T): T {
  if (!data) return data

  if (Array.isArray(data)) {
    return formatDocuments(data) as any
  }

  if (data && typeof data === "object") {
    return formatDocument(data as Record<string, any>) as any
  }

  return data
}

export function formatPaginatedResponse<T extends Record<string, any>>(
  data: T[],
  pagination: { page: number; limit: number; totalItems: number }
) {
  return {
    data: formatDocuments(data),
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.totalItems / pagination.limit),
    },
  }
}
export function cleanObject<T extends Record<string, any>>(obj: T): T {
  return cleanResponse(obj) as T
}

export function successResponse<T>({
  data,
  status = 200,
  message,
}: SuccessResponseParams<T>): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
    },
    { status }
  )
}

export function successPaginatedResponse<T>({
  data,
  pagination,
  status = 200,
  message,
}: SuccessPaginatedResponseParams<T>): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
      pagination,
    },
    { status }
  )
}

export function errorResponse({
  message,
  status = 400,
  code,
}: ErrorResponseParams): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(code && { code }),
    },
    { status }
  )
}

export function apiCreated<T>({
  data,
  message = "Created successfully",
  status = 201,
}: ApiCreatedParams<T>): NextResponse {
  return successResponse({ data, status, message })
}

export function apiUpdated<T>({
  data,
  message = "Updated successfully",
  status = 200,
}: ApiUpdatedParams<T>): NextResponse {
  return successResponse({ data, status, message })
}

export function apiDeleted({
  message = "Deleted successfully",
  status = 200,
}: ApiDeletedParams = {}): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
    },
    { status }
  )
}
