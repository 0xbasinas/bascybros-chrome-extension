import { useState, useEffect } from "react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Textarea } from "~components/ui/textarea"
import { Label } from "~components/ui/label"
import { Badge } from "~components/ui/badge"

type CaptureType = "note" | "resource" | "command" | "snippet" | "task"

interface Props {
  type: CaptureType
  onCapture: (data: { type: CaptureType | "CREATE_SNIPPET" | "CREATE_TASK"; payload: Record<string, string> }) => void
}

const FIELD_CONFIG: Record<CaptureType, { placeholder: string; titleLabel: string; extraFields?: Array<{ key: string; label: string; placeholder: string }> }> = {
  note: { placeholder: "Write a note...", titleLabel: "Title" },
  resource: { placeholder: "Paste a URL...", titleLabel: "Title" },
  command: { placeholder: "Paste a command...\ne.g. nmap -sV 10.10.10.1", titleLabel: "Command" },
  snippet: { placeholder: "Paste code...", titleLabel: "Title", extraFields: [{ key: "language", label: "Language", placeholder: "e.g. python, bash, javascript" }] },
  task: { placeholder: "Task details (optional)", titleLabel: "Task title", extraFields: [{ key: "status", label: "Status", placeholder: "open, in_progress, or done" }] },
}

export function CaptureForm({ type, onCapture }: Props) {
  const config = FIELD_CONFIG[type]
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Auto-fill from current tab
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) return
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? "",
      }).then(([r]) => {
        const text = r?.result
        if (text) {
          if (type === "command" || type === "note" || type === "snippet") setBody(text)
          else if (type === "resource") {
            if (/^https?:\/\//.test(text)) { setBody(text) }
            else { tab.url && setBody(tab.url); tab.title && setTitle(tab.title) }
          }
        } else {
          if (type === "resource") { tab.url && setBody(tab.url); tab.title && setTitle(tab.title) }
        }
      })
    })
  }, [type])

  const titleField = config.titleLabel
  const isCommand = type === "command"
  const isResource = type === "resource"

  function buildPayload(): Record<string, string> {
    if (isCommand) return { commandText: title || body, description: body || "" }
    if (isResource) return { title: title || body.slice(0, 200), url: body }
    if (type === "snippet") return { title, language: extra.language || "text", code: body }
    if (type === "task") return { title, detailsMarkdown: body, status: extra.status || "open" }
    return { title: title || body.slice(0, 80), contentMarkdown: body }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() && !title.trim()) return
    setSaving(true)
    try { await onCapture({ type, payload: buildPayload() }); setTitle(""); setBody(""); setExtra({}) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!isCommand && (
        <div className="space-y-1">
          <Label>{titleField}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleField} />
        </div>
      )}

      {config.extraFields?.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label>{f.label}</Label>
          <Input value={extra[f.key] || ""} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
        </div>
      ))}

      <div className="space-y-1">
        <Label>{isCommand ? "Description / full command" : isResource ? "URL" : "Content"}</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={config.placeholder}
          className={isCommand ? "min-h-[80px]" : "min-h-[120px]"}
          autoFocus
        />
      </div>

      {body.trim() && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{type}</Badge>
        </div>
      )}

      <Button type="submit" disabled={(!body.trim() && !title.trim()) || saving} className="w-full">
        {saving ? "Saving..." : `Save ${type}`}
      </Button>
    </form>
  )
}
