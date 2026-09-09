// components/projects/project-form.tsx

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useImperativeHandle, forwardRef } from "react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import {
  getProjectFormSchema,
  ProjectFormValues,
} from "@/hooks/projects/project-form-schema"
import { ProjectStatus } from "@/types/projects"
import { SelectUser } from "../users-chunks/select-user"
import { SelectUsers } from "../users-chunks/select-users"

export interface ProjectFormHandle {
  submit: () => void
}

interface ProjectFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<ProjectFormValues>
  onValid: (values: ProjectFormValues) => void
  users?: { id: string; name: string; email: string }[]
}

export const ProjectForm = forwardRef<ProjectFormHandle, ProjectFormProps>(
  function ProjectForm({ mode, defaultValues, onValid }, ref) {
    const t = useTranslations()

    const form = useForm<ProjectFormValues>({
      resolver: zodResolver(getProjectFormSchema(mode)),
      defaultValues: {
        name: defaultValues?.name ?? "",
        description: defaultValues?.description ?? "",
        status: defaultValues?.status ?? ProjectStatus.ACTIVE,
        owner: defaultValues?.owner ?? "",
        members: defaultValues?.members ?? [],
        startDate:
          defaultValues?.startDate ?? new Date().toISOString().split("T")[0],
        endDate: defaultValues?.endDate ?? "",
      },
    })

    useEffect(() => {
      form.reset({
        name: defaultValues?.name ?? "",
        description: defaultValues?.description ?? "",
        status: defaultValues?.status ?? ProjectStatus.ACTIVE,
        owner: defaultValues?.owner ?? "",
        members: defaultValues?.members ?? [],
        startDate:
          defaultValues?.startDate ?? new Date().toISOString().split("T")[0],
        endDate: defaultValues?.endDate ?? "",
      })
    }, [defaultValues, form])

    useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onValid)(),
    }))

    // Watch owner to exclude them from members list
    const owner = form.watch("owner")

    // Map status to translation keys
    const getStatusTranslationKey = (status: string): string => {
      const statusMap: Record<string, string> = {
        [ProjectStatus.ACTIVE]: "active",
        [ProjectStatus.ARCHIVED]: "archived",
        [ProjectStatus.COMPLETED]: "completed",
        [ProjectStatus.ON_HOLD]: "onHold",
      }
      return statusMap[status] || status.toLowerCase()
    }

    return (
      <Form {...form}>
        <form className="flex flex-col gap-4">
          {/* Project Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("projectName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("projectNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder={t("projectDescriptionPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status & Owner */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full bg-card py-6 shadow-md">
                      <SelectValue placeholder={t("selectStatus")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ProjectStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(getStatusTranslationKey(status))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner - using SelectUser */}
          <FormField
            control={form.control}
            name="owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("owner")}</FormLabel>
                <FormControl>
                  <SelectUser
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("selectOwner")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Members - using SelectUsers (multi-select) */}
          <FormField
            control={form.control}
            name="members"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("members")}</FormLabel>
                <FormControl>
                  <SelectUsers
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder={t("selectMembers")}
                    excludeUserId={owner}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("startDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("endDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    )
  }
)
