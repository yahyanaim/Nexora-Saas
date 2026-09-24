"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Project, ProjectStatus } from "@/types/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, type TabItem } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Activity,
  Settings,
  LayoutDashboard,
  Download,
} from "@/components/ui/carbon/icons"
import { SpaceAvatar } from "@/components/ui/space-avatar"

interface ProjectDetailProps {
  project: Project
  onClose: () => void
}

export function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState("overview")

  const taskCounts = {
    done: project.tasks.filter((t) => t.status === "done").length,
    in_progress: project.tasks.filter((t) => t.status === "in_progress").length,
    todo: project.tasks.filter((t) => t.status === "todo").length,
  }

  // Build tabs with content
  const tabs: TabItem[] = [
    {
      id: "overview",
      label: t("overview"),
      icon: <LayoutDashboard className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("progress")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {t("percentComplete", { percent: project.progress })}
                  </span>
                  <span className="text-muted-foreground">
                    {t("totalTasks", { count: project.tasks.length })}
                  </span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Tasks Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-500/10 p-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{taskCounts.done}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("completed")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-500/10 p-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {taskCounts.in_progress}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("inProgress")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{taskCounts.todo}</p>
                    <p className="text-sm text-muted-foreground">{t("todo")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("members")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {project.members.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <SpaceAvatar
                      name={member.user.name}
                      src={member.user.avatar || ""}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(member.role.toLowerCase())}
                      </p>
                    </div>
                  </div>
                ))}
                {project.members.length > 6 && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    {t("moreMembers", { count: project.members.length - 6 })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: "members",
      label: t("members"),
      icon: <Users className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>{t("teamMembers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <SpaceAvatar
                      name={member.user.name}
                      src={member.user.avatar || ""}
                      size="md"
                    />
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {t(member.role.toLowerCase())}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "files",
      label: t("files"),
      icon: <FileText className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>{t("projectFiles")}</CardTitle>
          </CardHeader>
          <CardContent>
            {project.files.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {t("noFilesUploaded")}
              </p>
            ) : (
              <div className="space-y-2">
                {project.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB •{" "}
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {file.uploadedBy.name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const blob = new Blob([
                            `Project Document: ${file.name}\n` +
                            `Project: ${project.name}\n` +
                            `Uploaded By: ${file.uploadedBy.name}\n` +
                            `Date: ${new Date(file.uploadedAt).toISOString()}\n` +
                            `File Size: ${(file.size / 1024).toFixed(1)} KB\n\n` +
                            `This document asset is synchronized with Nexora Workspace Storage.`
                          ], { type: "application/octet-stream" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = file.name
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "activity",
      label: t("activity"),
      icon: <Activity className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <SpaceAvatar
                    name={activity.user.name}
                    src={activity.user.avatar || ""}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {t(activity.action)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {activity.description}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "settings",
      label: t("settings"),
      icon: <Settings className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>{t("projectSettings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium">{t("projectStatus")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("currentStatus")}: {t(project.status.toLowerCase())}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium">{t("created")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium">{t("lastUpdated")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="border-t pt-4">
              <Button variant="destructive">{t("deleteProject")}</Button>
            </div>
          </CardContent>
        </Card>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Badge
                variant={
                  project.status === ProjectStatus.ACTIVE
                    ? "default"
                    : project.status === ProjectStatus.ARCHIVED
                      ? "secondary"
                      : "outline"
                }
              >
                {t(project.status.toLowerCase())}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(project.startDate).toLocaleDateString()}
                  {project.endDate &&
                    ` - ${new Date(project.endDate).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { generateProjectDocPdf } = await import("@/lib/pdf/generate-project-doc-pdf")
                await generateProjectDocPdf(project)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Brief
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("close")}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs
          tabs={tabs}
          defaultTabId={activeTab}
          onChange={(tab) => setActiveTab(tab.id)}
          containerClassName="bg-muted/50 rounded-xl"
          activeTabClassName="bg-background shadow-sm"
          contentClassName="mt-4"
          animateContent={true}
          instanceId="project-detail"
        />
      </div>
    </div>
  )
}
