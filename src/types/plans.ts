export interface Plan {
  id: string
  name: string
  price: string
  period: string | null
  description: string
  featured: boolean
  features: string[]
  createdAt: string
  updatedAt: string
}

export interface CreatePlanPayload {
  name: string
  price: string
  period?: string | null
  description: string
  featured?: boolean
  features: string[]
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {}

export interface PlanFilters {
  featured?: boolean
  search?: string
}
