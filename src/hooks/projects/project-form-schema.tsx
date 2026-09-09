import { z } from "zod"
import { ProjectStatus } from "@/types/projects"

export const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus),
  owner: z.string().min(1, "Owner is required"),
  members: z.array(z.string()).min(1, "At least one member is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>

export function getProjectFormSchema(mode: "create" | "edit") {
  return projectFormSchema
}
