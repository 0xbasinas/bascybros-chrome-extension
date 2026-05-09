import { createClerkClient } from "@clerk/chrome-extension/client"
import { createContextMenus } from "~lib/context-menus"
import { apiClient } from "~lib/api-client"
import { detectContentType } from "~lib/detector"

const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY as string
const BRIDGE_URL = getBridgeBaseUrl()

async function getToken(): Promise<string | null> {
  const clerk = await createClerkClient({ publishableKey, background: true })
  if (!clerk.session) return null
  return await clerk.session.getToken()
}

chrome.runtime.onInstalled.addListener(() => createContextMenus())

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return
  const token = await getToken()
  if (!token) { showNotification("Please sign in to BascyBros first"); return }

  switch (info.menuItemId) {
    case "save-page-as-resource": {
      const r = await apiClient.createResource(token, { title: tab.title ?? "Untitled", url: tab.url ?? info.pageUrl ?? "" })
      showNotification(r.ok ? "Page saved" : `Failed: ${r.message}`)
      break
    }
    case "save-selection-as-note": {
      const text = info.selectionText
      if (!text) return
      const d = detectContentType(text)
      let r
      if (d.type === "command") r = await apiClient.createCommand(token, { commandText: text, description: `From ${tab.url}` })
      else if (d.type === "url") r = await apiClient.createResource(token, { title: text.slice(0, 200), url: text })
      else r = await apiClient.createNote(token, { title: text.slice(0, 80), contentMarkdown: text })
      showNotification(r.ok ? `${d.type} saved` : `Failed: ${r.message}`)
      break
    }
    case "save-link-as-resource": {
      const r = await apiClient.createResource(token, { title: info.linkUrl ?? "Untitled", url: info.linkUrl ?? "" })
      showNotification(r.ok ? "Link saved" : `Failed: ${r.message}`)
      break
    }
    case "take-screenshot": {
      if (!tab?.id) return
      takeScreenshot(token, tab)
      break
    }
  }
})

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return
  const token = await getToken()
  if (!token) { showNotification("Please sign in first"); return }

  if (command === "quick-capture-note") {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.getSelection()?.toString() ?? "" })
    const text = result?.result as string | undefined
    if (!text) { showNotification("No text selected"); return }
    const d = detectContentType(text)
    const r = d.type === "command"
      ? await apiClient.createCommand(token, { commandText: text, description: `From ${tab.url}` })
      : await apiClient.createNote(token, { title: text.slice(0, 80), contentMarkdown: text })
    showNotification(r.ok ? "Saved" : `Failed: ${r.message}`)
  }
  if (command === "quick-capture-resource") {
    const r = await apiClient.createResource(token, { title: tab.title ?? "Untitled", url: tab.url ?? "" })
    showNotification(r.ok ? "Page saved" : `Failed: ${r.message}`)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, message: "Unauthorized sender" })
    return false
  }

  const parsed = parseBridgeMessage(message)
  if (!parsed) {
    sendResponse({ ok: false, message: "Invalid message payload" })
    return false
  }

  handleMessage(parsed).then(sendResponse)
  return true
})

function showNotification(message: string) {
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab?.id) chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (msg: string) => {
      const t = document.createElement("div")
      t.textContent = msg
      t.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;background:#262420;color:#faf9f8;padding:12px 20px;border-radius:8px;font-family:sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transition:opacity .3s"
      document.body.appendChild(t)
      requestAnimationFrame(() => { t.style.opacity = "1" })
      setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300) }, 3000)
    }, args: [message] })
  })
}

async function takeScreenshot(token: string, tab: chrome.tabs.Tab) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" })
    const res = await fetch(dataUrl)
    const blob = await res.blob()

    const formData = new FormData()
    formData.append("file", blob, `screenshot-${Date.now()}.png`)

    const uploadRes = await fetch(`${BRIDGE_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    if (!uploadRes.ok) {
      showNotification("Screenshot upload failed")
      return
    }

    const { url, storagePath, filename, mimeType, size } = await uploadRes.json()

    await fetch(`${BRIDGE_URL}/api/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, storagePath, filename, mimeType, size }),
    })

    const mdLink = `![${tab.title ?? "Screenshot"}](${url})`
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (md: string) => {
        navigator.clipboard.writeText(md).catch(() => {})
      },
      args: [mdLink],
    })

    showNotification("Screenshot saved — markdown copied to clipboard")
  } catch {
    showNotification("Screenshot capture failed")
  }
}

interface BridgeMessage {
  type: "CREATE_NOTE" | "CREATE_RESOURCE" | "CREATE_COMMAND"
    | "CREATE_SNIPPET" | "CREATE_TASK" | "SEARCH" | "APPEND_NOTE"
  payload?: unknown
}

function getBridgeBaseUrl() {
  const raw = (process.env.PLASMO_PUBLIC_BRIDGE_URL ?? "http://localhost:8787").trim()
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("PLASMO_PUBLIC_BRIDGE_URL is not a valid URL")
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (!isLocalhost && url.protocol !== "https:") {
    throw new Error("PLASMO_PUBLIC_BRIDGE_URL must use https outside localhost")
  }
  return url.toString().replace(/\/$/, "")
}

function parseBridgeMessage(input: unknown): BridgeMessage | null {
  if (!input || typeof input !== "object") return null
  const message = input as { type?: unknown; payload?: unknown }
  const allowedTypes: BridgeMessage["type"][] = [
    "CREATE_NOTE",
    "CREATE_RESOURCE",
    "CREATE_COMMAND",
    "CREATE_SNIPPET",
    "CREATE_TASK",
    "SEARCH",
    "APPEND_NOTE",
  ]
  if (typeof message.type !== "string" || !allowedTypes.includes(message.type as BridgeMessage["type"])) {
    return null
  }
  return { type: message.type as BridgeMessage["type"], payload: message.payload }
}

async function handleMessage(message: BridgeMessage) {
  const token = await getToken()

  switch (message.type) {
    case "CREATE_NOTE": return token ? apiClient.createNote(token, message.payload as any) : { ok: false, message: "Not authenticated" }
    case "CREATE_RESOURCE": return token ? apiClient.createResource(token, message.payload as any) : { ok: false, message: "Not authenticated" }
    case "CREATE_COMMAND": return token ? apiClient.createCommand(token, message.payload as any) : { ok: false, message: "Not authenticated" }
    case "CREATE_SNIPPET": return token ? apiClient.createSnippet(token, message.payload as any) : { ok: false, message: "Not authenticated" }
    case "CREATE_TASK": return token ? apiClient.createTask(token, message.payload as any) : { ok: false, message: "Not authenticated" }
    case "APPEND_NOTE": {
      if (!token) return { ok: false, message: "Not authenticated" }
      if (!message.payload || typeof message.payload !== "object") return { ok: false, message: "Invalid payload" }
      const payload = message.payload as { id?: unknown; markdown?: unknown }
      if (typeof payload.id !== "string" || typeof payload.markdown !== "string") {
        return { ok: false, message: "Invalid payload" }
      }
      return apiClient.appendToNote(token, payload.id, payload.markdown)
    }
    case "SEARCH": {
      if (!token) return { ok: false, message: "Not authenticated" }
      if (!message.payload || typeof message.payload !== "object") return { ok: false, message: "Invalid payload" }
      const payload = message.payload as { query?: unknown }
      if (typeof payload.query !== "string") return { ok: false, message: "Invalid payload" }
      return apiClient.search(token, payload.query)
    }
    default: return { ok: false, message: "Unknown message type" }
  }
}
