"use client"

import { Project } from "@/types/projects"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ProjectDetail } from "./project-detail"

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: ProjectDialogProps) {
  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <ProjectDetail project={project} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
