"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Download, File, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClientFileMutations, useClientFiles } from "@/hooks/workforce/use-client-files"
import { MAX_CLIENT_FILE_BYTES, MAX_CLIENT_FILES } from "@/lib/api/client-files-api"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { CLIENT_FILE_CATEGORIES, type ClientFile, type ClientFileCategory } from "@/types/work-crm"

const iconOf = (type: string) => (type.startsWith("image/") ? FileImage : /sheet|excel|csv/.test(type) ? FileSpreadsheet : /pdf|word|text|document/.test(type) ? FileText : File)

/** 1.2 MB, 340 KB… in the reader's language. */
function size(bytes: number, locale: string) {
  const kb = bytes / 1024
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  return kb >= 1024 ? `${fmt.format(kb / 1024)} MB` : `${fmt.format(Math.max(1, Math.round(kb)))} KB`
}

/**
 * The Files tab of a client (CRM step 10): drop or pick files, sort them by
 * kind (contract, proposal, brief…), download or remove them.
 */
export function ClientFilesSection({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: files = [], isLoading } = useClientFiles(clientId)
  const { add, setCategory, remove } = useClientFileMutations(clientId)
  const [category, setNewCategory] = React.useState<ClientFileCategory>("other")
  const [filter, setFilter] = React.useState<ClientFileCategory | "all">("all")
  const [dragging, setDragging] = React.useState(false)
  const [removing, setRemoving] = React.useState<ClientFile | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const full = files.length >= MAX_CLIENT_FILES
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso))

  const upload = (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      if (file.size > MAX_CLIENT_FILE_BYTES) {
        toast.error(t("cfTooBig", { name: file.name }))
        continue
      }
      const reader = new FileReader()
      reader.onload = () => add.mutate({ file: { name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) }, category })
      reader.readAsDataURL(file)
    }
    if (input.current) input.current.value = ""
  }

  const shown = filter === "all" ? files : files.filter((f) => f.category === filter)
  const counts = Object.fromEntries(CLIENT_FILE_CATEGORIES.map((c) => [c, files.filter((f) => f.category === c).length])) as Record<ClientFileCategory, number>

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (!full) upload(e.dataTransfer.files)
          }}
          className={cn("flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:flex-row sm:text-start", dragging ? "border-primary bg-primary/5" : "border-border")}
        >
          <Upload className="size-6 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("cfDrop")}</p>
            <p className="text-xs text-muted-foreground">{full ? t("cfFull", { max: MAX_CLIENT_FILES }) : t("cfLimits", { size: "500 KB", max: MAX_CLIENT_FILES })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`cf-cat-${clientId}`} className="text-xs text-muted-foreground">{t("cfKind")}</Label>
            <Select value={category} onValueChange={(v) => setNewCategory(v as ClientFileCategory)}>
              <SelectTrigger id={`cf-cat-${clientId}`} className="h-9 w-36 bg-card"><SelectValue>{t(`cfCat_${category}`)}</SelectValue></SelectTrigger>
              <SelectContent>{CLIENT_FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`cfCat_${c}`)}</SelectItem>)}</SelectContent>
            </Select>
            <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} aria-label={t("cfChoose")} id={`cf-input-${clientId}`} onChange={(e) => upload(e.target.files)} disabled={full} />
            <Button variant="outline" disabled={full || add.isPending} onClick={() => input.current?.click()}>
              <Upload className="size-4" />
              {t("cfChoose")}
            </Button>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("cfKind")}>
          {(["all", ...CLIENT_FILE_CATEGORIES] as const).filter((c) => c === "all" || counts[c] > 0).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {c === "all" ? t("all") : t(`cfCat_${c}`)} <span className="tabular-nums">({c === "all" ? files.length : counts[c]})</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : files.length === 0 ? (
        <EmptyState icon={File} title={t("cfEmpty")} hint={t("cfEmptyHint")} />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {shown.map((f) => {
            const Icon = iconOf(f.type)
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden><Icon className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{t("cfLine", { size: size(f.size, locale), name: f.addedBy, date: date(f.createdAt) })}</p>
                </div>
                {canEdit ? (
                  <Select value={f.category} onValueChange={(v) => setCategory.mutate({ id: f.id, category: v as ClientFileCategory })}>
                    <SelectTrigger aria-label={t("cfKindOf", { name: f.name })} className="h-8 w-32 bg-card text-xs"><SelectValue>{t(`cfCat_${f.category}`)}</SelectValue></SelectTrigger>
                    <SelectContent>{CLIENT_FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`cfCat_${c}`)}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t(`cfCat_${f.category}`)}</span>
                )}
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <a href={f.dataUrl} download={f.name} aria-label={t("cfDownload", { name: f.name })}><Download className="size-4" /></a>
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={t("cfRemove", { name: f.name })} onClick={() => setRemoving(f)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmAlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t("cfRemoveTitle")}
        description={t("cfRemoveConfirm", { name: removing?.name ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      />
    </div>
  )
}
