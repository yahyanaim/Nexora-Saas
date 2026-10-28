"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parseRichText, type Inline } from "@/lib/workforce/task-extras"

/** Opens a task from its key (ORB-01#4); null when the key points nowhere. */
export type KeyResolver = (key: string) => { href?: string; onOpen?: () => void; title?: string } | null

function InlineText({ parts, resolve }: { parts: Inline[]; resolve?: KeyResolver }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "bold") return <strong key={i} className="font-semibold">{p.text}</strong>
        if (p.kind === "italic") return <em key={i}>{p.text}</em>
        if (p.kind === "code") return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{p.text}</code>
        if (p.kind === "link") return <a key={i} href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline-offset-2 hover:underline">{p.text}</a>
        if (p.kind === "key") {
          const target = resolve?.(p.text)
          if (target?.onOpen) return <button key={i} type="button" onClick={target.onOpen} title={target.title} className="rounded bg-info-soft px-1 font-mono text-[0.85em] font-medium text-info-foreground hover:underline">{p.text}</button>
          if (target?.href) return <a key={i} href={target.href} title={target.title} className="rounded bg-info-soft px-1 font-mono text-[0.85em] font-medium text-info-foreground hover:underline">{p.text}</a>
        }
        return <React.Fragment key={i}>{p.text}</React.Fragment>
      })}
    </>
  )
}

/**
 * A description with light formatting (P1): **bold**, _italic_, `code`,
 * links, lists, checklists and headings. Text is never read as HTML.
 */
export function RichText({ source, resolve, className }: { source: string; resolve?: KeyResolver; className?: string }) {
  const blocks = React.useMemo(() => parseRichText(source), [source])
  return (
    <div className={cn("space-y-2 break-words text-sm leading-relaxed", className)}>
      {blocks.map((b, i) => {
        if (b.kind === "heading") return <p key={i} className="font-semibold"><InlineText parts={b.inlines} resolve={resolve} /></p>
        if (b.kind === "paragraph") return <p key={i}><InlineText parts={b.inlines} resolve={resolve} /></p>
        if (b.kind === "checks")
          return (
            <ul key={i} className="space-y-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span aria-hidden className={cn("mt-1 grid size-3.5 shrink-0 place-items-center rounded border text-[9px]", item.done ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{item.done ? "✓" : ""}</span>
                  <span className={cn(item.done && "text-muted-foreground line-through")}><span className="sr-only">{item.done ? "✓ " : "☐ "}</span><InlineText parts={item.inlines} resolve={resolve} /></span>
                </li>
              ))}
            </ul>
          )
        const List = b.kind === "numbers" ? "ol" : "ul"
        return (
          <List key={i} className={cn("space-y-0.5 ps-5", b.kind === "numbers" ? "list-decimal" : "list-disc")}>
            {b.items.map((item, j) => <li key={j}><InlineText parts={item} resolve={resolve} /></li>)}
          </List>
        )
      })}
    </div>
  )
}

const TOOLS = [
  { key: "bold", label: "B", before: "**", after: "**", className: "font-bold" },
  { key: "italic", label: "I", before: "_", after: "_", className: "italic" },
  { key: "code", label: "</>", before: "`", after: "`", className: "font-mono text-[11px]" },
  { key: "list", label: "•", line: "- " },
  { key: "checklist", label: "☐", line: "- [ ] " },
  { key: "link", label: "🔗", before: "[", after: "](https://)" },
] as const

/** Textarea with a formatting toolbar and a preview (P1). */
export function RichTextEditor({ id, value, onChange, resolve, label, placeholder, hint }: { id: string; value: string; onChange: (v: string) => void; resolve?: KeyResolver; label: string; placeholder?: string; hint?: string }) {
  const t = useTranslations()
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = React.useState(false)

  const apply = (tool: (typeof TOOLS)[number]) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    let next: string
    let caret: number
    if ("line" in tool) {
      const start = value.lastIndexOf("\n", a - 1) + 1
      next = value.slice(0, start) + tool.line + value.slice(start)
      caret = b + tool.line.length
    } else {
      const picked = value.slice(a, b) || t(`rtSample_${tool.key}`)
      next = value.slice(0, a) + tool.before + picked + tool.after + value.slice(b)
      caret = a + tool.before.length + picked.length
    }
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <div className="flex rounded-full border border-border p-0.5" role="group" aria-label={t("rtMode")}>
          {[false, true].map((p) => (
            <button key={String(p)} type="button" aria-pressed={preview === p} onClick={() => setPreview(p)} className={cn("h-6 rounded-full px-2.5 text-xs font-medium", preview === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t(p ? "rtPreview" : "rtWrite")}
            </button>
          ))}
        </div>
      </div>
      {preview ? (
        <div className="min-h-24 rounded-xl border border-border bg-muted/30 p-3">
          {value.trim() ? <RichText source={value} resolve={resolve} /> : <p className="text-sm text-muted-foreground">{t("rtEmpty")}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1" role="toolbar" aria-label={t("rtToolbar")}>
            {TOOLS.map((tool) => (
              <button key={tool.key} type="button" onClick={() => apply(tool)} aria-label={t(`rtTool_${tool.key}`)} title={t(`rtTool_${tool.key}`)} className={cn("grid h-7 min-w-7 place-items-center rounded-lg border border-border px-1.5 text-xs hover:bg-muted", "className" in tool && tool.className)}>
                <span aria-hidden>{tool.label}</span>
              </button>
            ))}
          </div>
          <Textarea ref={ref} id={id} rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? t("rtPlaceholder")} />
          <p className="text-xs text-muted-foreground">{hint ?? t("rtHint")}</p>
        </>
      )}
    </div>
  )
}
