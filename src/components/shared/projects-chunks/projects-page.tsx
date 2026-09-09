"use client"

import { useMemo, useRef, useState } from "react"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import {
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  archiveProjectApi,
} from "@/lib/api/projects-api"
import { Project, ProjectStatus } from "@/types/projects"
import { useProjectsTable } from "@/hooks/projects/use-projects-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { Plus } from "lucide-react"
import { ProjectForm, ProjectFormHandle } from "./project-form"
import { getProjectsColumns } from "./projects-columns"
import { ProjectsSummaryCards } from "./projects-summary-cards"
import { ProjectDialog } from "./project-dialog"

type PendingAction =
  | { type: "delete"; project: Project }
  | { type: "archive"; project: Project }
  | { type: "complete"; project: Project }
  | { type: "activate"; project: Project }
  | null

export default function ProjectsPage() {
  const t = useTranslations()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const formRef = useRef<ProjectFormHandle>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const {
    items: projects,
    pageCount,
    totalItems,
    isLoading,
    isFetching,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh,
  } = useProjectsTable()

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "projects",
      createFn: createProjectApi,
      updateFn: updateProjectApi,
      deleteFn: deleteProjectApi,
      entityLabel: "Project",
    })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingProject(null)
    setFormOpen(true)
  }

  function openEditForm(project: Project) {
    setFormMode("edit")
    setEditingProject(project)
    setFormOpen(true)
  }

  function handleFormValid(values: any) {
    if (formMode === "create") {
      create(values, { onSuccess: () => setFormOpen(false) })
    } else if (editingProject) {
      update(editingProject.id, values)
      setFormOpen(false)
    }
  }

  async function handleArchive(project: Project) {
    setPendingAction({ type: "archive", project })
  }

  const handleComplete = (project: Project) => {
    setPendingAction({ type: "complete", project })
  }

  const handleActivate = (project: Project) => {
    setPendingAction({ type: "activate", project })
  }

  const handleDuplicate = (project: Project) => {
    const newProject = {
      name: `${project.name} (${t("copy")})`,
      description: project.description,
      status: ProjectStatus.ACTIVE,
      owner: project.owner.id,
      members: project.members.map((m) => m.user.id),
      startDate: new Date().toISOString().split("T")[0],
      endDate: project.endDate,
    }
    create(newProject, {
      onSuccess: () => {
        toast.success(t("projectDuplicated"))
        refresh()
      },
    })
  }

  const handleExport = (project: Project) => {
    const data = JSON.stringify(project, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${project.name}-export.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t("projectExported"))
  }

  async function handleConfirm() {
    if (!pendingAction) return

    setIsProcessing(true)
    try {
      switch (pendingAction.type) {
        case "delete":
          remove(pendingAction.project.id, {
            onSuccess: () => setPendingAction(null),
          })
          break
        case "archive":
          await archiveProjectApi(pendingAction.project.id)
          refresh()
          setPendingAction(null)
          toast.success(t("projectArchived"))
          break
        case "complete":
          await updateProjectApi(pendingAction.project.id, {
            status: ProjectStatus.COMPLETED,
          })
          refresh()
          setPendingAction(null)
          toast.success(t("projectCompleted"))
          break
        case "activate":
          await updateProjectApi(pendingAction.project.id, {
            status: ProjectStatus.ACTIVE,
          })
          refresh()
          setPendingAction(null)
          toast.success(t("projectActivated"))
          break
      }
    } catch (error: any) {
      toast.error(error.message || t("actionFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  const getDefaultValues = (project: Project | null) => {
    if (!project) return undefined

    return {
      name: project.name,
      description: project.description || "",
      status: project.status,
      owner: project.owner.id,
      members: project.members.map((m) => m.user.id),
      startDate:
        project.startDate?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
      endDate: project.endDate?.split("T")[0] || "",
    }
  }

  const columns = useMemo(
    () =>
      getProjectsColumns(
        {
          onView: (project) => {
            setSelectedProject(project)
            setDetailOpen(true)
          },
          onEdit: openEditForm,
          onArchive: handleArchive,
          onDelete: (project) => setPendingAction({ type: "delete", project }),
          onDuplicate: handleDuplicate,
          onComplete: handleComplete,
          onActivate: handleActivate,
          onExport: handleExport,
        },
        t
      ),
    [t]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.project.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteProject"),
          description: t("deleteProjectConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting || isProcessing,
        }
      case "archive":
        return {
          title: t("archiveProject"),
          description: t("archiveProjectConfirmation", { name }),
          confirmLabel: t("archive"),
          destructive: false,
          isLoading: isProcessing,
        }
      case "complete":
        return {
          title: t("completeProject"),
          description: t("completeProjectConfirmation", { name }),
          confirmLabel: t("complete"),
          destructive: false,
          isLoading: isProcessing,
        }
      case "activate":
        return {
          title: t("activateProject"),
          description: t("activateProjectConfirmation", { name }),
          confirmLabel: t("activate"),
          destructive: false,
          isLoading: isProcessing,
        }
      default:
        return null
    }
  }, [pendingAction, isDeleting, isProcessing, t])

  return (
    <>
      <ProjectsSummaryCards />

      <DataTable
        manual
        title={t("projects")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={projects}
        rowCount={totalItems}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("searchProjects")}
        actions={[
          {
            label: t("create"),
            onClick: openCreateForm,
            iconOnly: true,
            icon: Plus,
            variant: "primary",
          },
        ]}
        filters={[
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("active"), value: ProjectStatus.ACTIVE },
              { label: t("archived"), value: ProjectStatus.ARCHIVED },
              { label: t("completed"), value: ProjectStatus.COMPLETED },
              { label: t("onHold"), value: ProjectStatus.ON_HOLD },
            ],
          },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("createProject")}
        editTitle={t("editProject")}
        description={
          formMode === "create"
            ? t("createNewProject")
            : t("updateProjectDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <ProjectForm
          ref={formRef}
          mode={formMode}
          defaultValues={getDefaultValues(editingProject)}
          onValid={handleFormValid}
        />
      </DataTableEntityFormSheet>

      <ProjectDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        project={selectedProject}
      />

      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
