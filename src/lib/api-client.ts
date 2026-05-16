import { createClientRateLimiter, parseRetryAfterSeconds } from "~lib/client-rate-limit"

const BRIDGE_URL = getBridgeBaseUrl()
const bridgeRateLimiter = createClientRateLimiter()

interface ApiResult {
  ok: boolean
  message?: string
  id?: string
  results?: Array<{ id: string; title: string; type: string }>
  status?: string
  db?: string
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

async function fetchBridge<T = ApiResult>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getBridgeToken()
  if (!token) throw new Error("Not authenticated")

  await bridgeRateLimiter.acquire()

  const res = await fetch(`${BRIDGE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string
      retryAfter?: number
    }
    if (res.status === 429) {
      const retryAfter = parseRetryAfterSeconds(res, body)
      const suffix = retryAfter ? ` Try again in ${retryAfter}s.` : ""
      return {
        ok: false,
        message: `${body.message ?? "Too many requests."}${suffix}`,
      } as T
    }
    return { ok: false, message: body.message ?? `HTTP ${res.status}` } as T
  }

  return res.json()
}

async function getBridgeToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
      resolve(response?.token ?? null)
    })
  })
}

export const apiClient = {
  createNote(_token: string, data: { title: string; contentMarkdown: string }) {
    return fetchBridge("/api/notes", { method: "POST", body: JSON.stringify(data) })
  },
  appendToNote(_token: string, id: string, markdown: string) {
    return fetchBridge(`/api/notes/${id}/append`, { method: "POST", body: JSON.stringify({ markdown }) })
  },
  createResource(_token: string, data: { title: string; url: string }) {
    return fetchBridge("/api/resources", { method: "POST", body: JSON.stringify(data) })
  },
  createCommand(_token: string, data: { commandText: string; description: string }) {
    return fetchBridge("/api/commands", { method: "POST", body: JSON.stringify(data) })
  },
  createSnippet(_token: string, data: { title: string; language: string; code: string }) {
    return fetchBridge("/api/snippets", { method: "POST", body: JSON.stringify(data) })
  },
  createTask(_token: string, data: { title: string; detailsMarkdown?: string; status?: string }) {
    return fetchBridge("/api/tasks", { method: "POST", body: JSON.stringify(data) })
  },
  search(_token: string, query: string) {
    return fetchBridge("/api/search?q=" + encodeURIComponent(query))
  },
  async checkHealth(): Promise<ApiResult> {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/health`)
      return await res.json()
    } catch {
      return { ok: false, status: "error", db: "disconnected" }
    }
  },
}

export async function sendBridgeMessage(type: string, payload?: unknown): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, message: chrome.runtime.lastError.message })
      } else {
        resolve(response)
      }
    })
  })
}
