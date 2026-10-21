"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Download, Eye, EyeOff, LinkIcon, Paperclip, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { useTaskAttachmentMutations, useTaskAttachments } from "@/hooks/workforce/use-task-collab"
import { useTaskMutations } from "@/hooks/workforce/use-work-projects"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { createId } from "@/lib/workforce/demo-store"
import { isWebUrl, taskKey, taskLinks } from "@/lib/workforce/task-extras"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { TaskRelationType, isClosedStatus, type WorkProject, type WorkTask } from "@/types/work-projects"
import type { Employee } from "@/types/workforce"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { stateLabel } from "./project-labels"
import { projectStates, stateOf } from "@/lib/workforce/task-states"

interface Props {
  task: WorkTask
  /** Everyone who may watch the task */
  people: Employee[]
  /** Every task of the workspace, to link to and to read relations from */
  allTasks: WorkTask[]
  projects: WorkProject[]
  canEdit: boolean
  onOpenTask: (task: WorkTask) => void
}

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

/**
 * What sits around a task (P1): its key, watching it, links and files, and
 * the tasks it waits for, blocks, duplicates or relates to.
 */
export function TaskDetailsPanel({ task, people, allTasks, projects, canEdit, onOpenTask }: Props) {
  const t = useTranslations()
  const me = useCurrentEmployee()
  const { update } = useTaskMutations()
  const { data: files = [] } = useTaskAttachments(task.id)
  const { add: addFile, remove: removeFile } = useTaskAttachmentMutations(task.id)
  const projectOf = (id: string) => projects.find((p) => p.id === id)
  const key = taskKey(task, projectOf(task.projectId))
  const keyOf = (x: WorkTask) => taskKey(x, projectOf(x.projectId))
  const links = taskLinks(task, allTasks)
  const watching = !!me && (task.watcherIds ?? []).includes(me.id)

  const [linkUrl, setLinkUrl] = React.useState("")
  const [linkTitle, setLinkTitle] = React.useState("")
  const [relType, setRelType] = React.useState<TaskRelationType>(TaskRelationType.RELATES)
  const [relTask, setRelTask] = React.useState("")
  const watchers = (task.watcherIds ?? []).map((id) => people.find((e) => e.id === id)).filter((e): e is Employee => !!e)
  const notWatching = people.filter((e) => !(task.watcherIds ?? []).includes(e.id))

  const save = (input: Partial<WorkTask>) => update.mutate({ id: task.id, input })
  const toggleWatch = () => me && save({ watcherIds: watching ? (task.watcherIds ?? []).filter((id) => id !== me.id) : [...(task.watcherIds ?? []), me.id] })
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?task=${task.id}`)
      toast.success(t("tkLinkCopied"))
    } catch {
      toast.error(t("tkLinkNotCopied"))
    }
  }
  const addLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isWebUrl(linkUrl)) return
    save({ links: [...(task.links ?? []), { id: createId("lnk"), url: linkUrl.trim(), title: linkTitle.trim() || undefined }] })
    setLinkUrl("")
    setLinkTitle("")
  }
  const attach = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => addFile.mutate({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const ownRelation = (id: string) => (task.relations ?? []).some((r) => r.taskId === id)
  const addRelation = () => {
    if (!relTask) return
    save({ relations: [...(task.relations ?? []).filter((r) => r.taskId !== relTask), { type: relType, taskId: relTask }] })
    setRelTask("")
  }
  // tasks already tied to this one (either side, any kind) are not offered again
  const related = new Set([...links.blockedBy, ...links.blocks, ...links.duplicates, ...links.relates].map((x) => x.id))
  const linkable = allTasks.filter((x) => x.id !== task.id && !related.has(x.id))
  const groups = [
    { key: "blockedBy", label: t("tkBlockedBy"), items: links.blockedBy, removable: false },
    { key: "blocks", label: t("tkBlocks"), items: links.blocks, removable: false },
    { key: "duplicates", label: t("tkDuplicates"), items: links.duplicates, removable: true },
    { key: "relates", label: t("tkRelates"), items: links.relates, removable: true },
  ].filter((g) => g.items.length)

  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-2">
        {key && <Badge variant="outline" className="border-transparent bg-muted font-mono text-foreground">{key}</Badge>}
        <Button type="button" size="sm" variant="ghost" onClick={() => void copyLink()}><Copy className="size-4" />{t("tkCopyLink")}</Button>
        {me && (
          <Button type="button" size="sm" variant={watching ? "secondary" : "outline"} onClick={toggleWatch} aria-pressed={watching} className="ms-auto">
            {watching ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {watching ? t("tkUnwatch") : t("tkWatch")}
          </Button>
        )}
      </div>

      <section aria-labelledby={`tk-watch-${task.id}`} className="flex flex-col gap-2">
        <h3 id={`tk-watch-${task.id}`} className="text-sm font-medium">{t("tkWatchers")}</h3>
        <p className="-mt-1 text-xs text-muted-foreground">{t("tkWatchersHint")}</p>
        {watchers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tkNoWatchers")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {watchers.map((e) => (
              <li key={e.id} className="flex items-center gap-1.5 rounded-full border border-border py-0.5 ps-0.5 pe-2 text-xs">
                <SpaceAvatar name={e.name} size="xs" />
                {e.name}
                {canEdit && (
                  <button type="button" aria-label={t("tkRemoveWatcher", { name: e.name })} onClick={() => save({ watcherIds: (task.watcherIds ?? []).filter((id) => id !== e.id) })} className="rounded-full px-1 text-muted-foreground hover:text-foreground">×</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && notWatching.length > 0 && (
          <Select value="" onValueChange={(id) => save({ watcherIds: [...(task.watcherIds ?? []), id] })}>
            <SelectTrigger className="w-56" aria-label={t("tkAddWatcher")}><SelectValue placeholder={t("tkAddWatcher")} /></SelectTrigger>
            <SelectContent>{notWatching.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </section>

      <section aria-labelledby={`tk-links-${task.id}`} className="flex flex-col gap-2">
        <h3 id={`tk-links-${task.id}`} className="text-sm font-medium">{t("tkLinksFiles")}</h3>
        {(task.links ?? []).length === 0 && files.length === 0 && <p className="text-sm text-muted-foreground">{t("tkNoLinks")}</p>}
        <ul className="flex flex-col gap-1.5">
          {(task.links ?? []).map((l) => (
            <li key={l.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 truncate text-primary hover:underline">{l.title || l.url}</a>
              {canEdit && <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={t("tkRemoveLink", { name: l.title || l.url })} onClick={() => save({ links: (task.links ?? []).filter((x) => x.id !== l.id) })}><Trash2 className="size-3.5" /></Button>}
            </li>
          ))}
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name} <span className="text-xs text-muted-foreground">· {size(f.size)} · {f.addedBy}</span></span>
              <Button type="button" variant="ghost" size="icon" className="size-7" asChild><a href={f.dataUrl} download={f.name} aria-label={t("tkDownload", { name: f.name })}><Download className="size-3.5" /></a></Button>
              {canEdit && <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={t("tkRemoveFile", { name: f.name })} onClick={() => removeFile.mutate(f.id)}><Trash2 className="size-3.5" /></Button>}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="flex flex-col gap-2">
            <form onSubmit={addLink} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" aria-label={t("tkLinkUrl")} aria-invalid={!!linkUrl && !isWebUrl(linkUrl)} className="col-span-2" />
              <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder={t("tkLinkTitle")} aria-label={t("tkLinkTitle")} />
              <Button type="submit" variant="outline" disabled={!isWebUrl(linkUrl)}><Plus className="size-4" />{t("tkAddLink")}</Button>
            </form>
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
              <Paperclip className="size-3.5" />
              {t("tkAttach")}
              <input type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = "" }} aria-label={t("tkAttach")} />
            </label>
            <p className="text-xs text-muted-foreground">{t("tkAttachHint")}</p>
          </div>
        )}
      </section>

      <section aria-labelledby={`tk-rel-${task.id}`} className="flex flex-col gap-2">
        <h3 id={`tk-rel-${task.id}`} className="text-sm font-medium">{t("tkLinkedTasks")}</h3>
        {groups.length === 0 && <p className="text-sm text-muted-foreground">{t("tkNoLinkedTasks")}</p>}
        {groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{g.label}</span>
            <ul className="flex flex-col gap-1">
              {g.items.map((x) => (
                <li key={x.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm">
                  <button type="button" onClick={() => onOpenTask(x)} className="flex min-w-0 flex-1 items-center gap-2 text-start hover:text-primary">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{keyOf(x)}</span>
                    <span className={cn("truncate", isClosedStatus(x.status) && "text-muted-foreground line-through")}>{x.title}</span>
                  </button>
                  <span className="shrink-0 text-xs text-muted-foreground">{stateLabel(stateOf(x, projectStates(projects.find((p) => p.id === x.projectId))), t)}</span>
                  {canEdit && g.removable && ownRelation(x.id) && (
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={t("tkUnlink", { name: x.title })} onClick={() => save({ relations: (task.relations ?? []).filter((r) => r.taskId !== x.id) })}><Trash2 className="size-3.5" /></Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {canEdit && linkable.length > 0 && (
          <div className="grid gap-2">
            <div className="space-y-1">
              <Label htmlFor={`rel-type-${task.id}`} className="text-xs">{t("tkRelationType")}</Label>
              <Select value={relType} onValueChange={(v) => setRelType(v as TaskRelationType)}>
                <SelectTrigger id={`rel-type-${task.id}`} className="w-full"><SelectValue>{t(relType === TaskRelationType.DUPLICATE ? "tkDuplicates" : "tkRelates")}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskRelationType.RELATES}>{t("tkRelates")}</SelectItem>
                  <SelectItem value={TaskRelationType.DUPLICATE}>{t("tkDuplicates")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`rel-task-${task.id}`} className="text-xs">{t("task")}</Label>
              <Select value={relTask || undefined} onValueChange={setRelTask}>
                <SelectTrigger id={`rel-task-${task.id}`} className="w-full min-w-0"><SelectValue placeholder={t("tkPickTask")}>{relTask ? (() => { const x = linkable.find((y) => y.id === relTask); return x ? `${keyOf(x)} · ${x.title}` : "" })() : undefined}</SelectValue></SelectTrigger>
                <SelectContent>{linkable.map((x) => <SelectItem key={x.id} value={x.id}>{keyOf(x)} · {x.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={addRelation} disabled={!relTask} className="justify-self-start"><Plus className="size-4" />{t("tkLink")}</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("tkWaitsHint")}</p>
      </section>
    </div>
  )
}
