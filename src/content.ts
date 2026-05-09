import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "*://*.tryhackme.com/*",
    "*://*.hackthebox.com/*",
    "*://portswigger.net/*",
    "*://*.medium.com/*",
    "*://*.github.com/*",
    "*://*.cybrary.it/*",
    "*://*.pentesterlab.com/*",
    "*://*.hackthissite.org/*",
    "*://overthewire.org/*",
    "*://*.root-me.org/*",
    "*://*.vulnhub.com/*",
    "*://*.picoctf.org/*",
    "*://crackmes.one/*",
    "*://*.offsec.com/*",
    "*://academy.hackthebox.com/*",
    "*://*.rangeforce.com/*",
    "*://*.immersivelabs.com/*",
    "*://*.blueteamlabs.online/*",
    "*://*.letsdefend.io/*",
    "*://*.cyberdefenders.org/*",
    "*://*.securityblue.team/*",
    "*://*.sans.org/*",
    "*://*.elearnsecurity.com/*",
    "*://*.ine.com/*",
  ],
}

function scanPage() {
  const findings: Array<{ type: "code" | "cve" | "command"; text: string }> = []
  const seen = new Set<string>()

  document.querySelectorAll("code, pre").forEach((el) => {
    const text = el.textContent?.trim()
    if (text && text.length > 5 && text.length < 5000) {
      findings.push({ type: "code", text })
    }
  })

  const bodyText = document.body.innerText
  for (const match of bodyText.matchAll(/CVE-\d{4}-\d{4,}/gi)) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      findings.push({ type: "cve", text: match[0] })
    }
  }

  for (const match of bodyText.matchAll(/(?:^|\n)\s*[$#>]\s*(.+)/gm)) {
    const cmd = match[1]?.trim()
    if (cmd && cmd.length > 2 && !seen.has(cmd)) {
      seen.add(cmd)
      findings.push({ type: "command", text: cmd })
    }
  }

  return findings
}

function injectBadge(findings: ReturnType<typeof scanPage>) {
  document.getElementById("bascybros-badge")?.remove()
  if (findings.length === 0) return

  const badge = document.createElement("div")
  badge.id = "bascybros-badge"
  badge.textContent = `${findings.length}`
  badge.title = `${findings.length} items found — click to capture`
  badge.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; z-index: 2147483646;
    width: 36px; height: 36px; border-radius: 50%;
    background: #3a352c; color: white; font-family: sans-serif;
    font-size: 14px; font-weight: 700; display: flex;
    align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.2s;
  `
  badge.addEventListener("click", () => {
    showFindingsPanel(findings)
    badge.remove()
  })
  badge.addEventListener("mouseenter", () => badge.style.transform = "scale(1.1)")
  badge.addEventListener("mouseleave", () => badge.style.transform = "scale(1)")
  document.body.appendChild(badge)
}

function showFindingsPanel(findings: ReturnType<typeof scanPage>) {
  document.getElementById("bascybros-panel")?.remove()

  const panel = document.createElement("div")
  panel.id = "bascybros-panel"
  panel.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; z-index: 2147483647;
    width: 360px; max-height: 400px; overflow-y: auto;
    background: #262420; color: #faf9f8; border-radius: 12px;
    font-family: sans-serif; font-size: 13px; padding: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `
  const header = document.createElement("div")
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"
  const headerText = document.createElement("span")
  headerText.style.cssText = "font-weight:700;font-size:15px"
  headerText.textContent = `Found ${findings.length} items`
  const closeBtn = document.createElement("button")
  closeBtn.id = "bascybros-close"
  closeBtn.style.cssText = "background:none;border:none;color:#b3afa9;cursor:pointer;font-size:18px"
  closeBtn.textContent = "×"
  header.append(headerText, closeBtn)

  const list = document.createElement("div")
  list.id = "bascybros-list"

  const captureAllBtn = document.createElement("button")
  captureAllBtn.id = "bascybros-capture-all"
  captureAllBtn.style.cssText = "width:100%;margin-top:12px;padding:8px;background:#3a352c;border:none;border-radius:6px;color:white;font-weight:600;cursor:pointer;font-size:14px"
  captureAllBtn.textContent = "Capture All"

  panel.append(header, list, captureAllBtn)

  document.body.appendChild(panel)

  findings.forEach((item, i) => {
    const row = document.createElement("div")
    row.style.cssText = "padding:8px 0;border-bottom:1px solid #36322d;display:flex;justify-content:space-between;align-items:center"
    const left = document.createElement("div")
    left.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
    const type = document.createElement("span")
    type.style.cssText = "color:#8b8781;font-size:11px"
    type.textContent = item.type.toUpperCase()
    const text = document.createElement("span")
    text.style.cssText = "margin-left:8px"
    text.textContent = item.text.slice(0, 80)
    left.append(type, text)

    const addButton = document.createElement("button")
    addButton.setAttribute("data-index", String(i))
    addButton.style.cssText = "background:#36322d;border:none;color:#ece8e3;cursor:pointer;padding:4px 10px;border-radius:4px;font-size:12px;margin-left:8px"
    addButton.textContent = "+"
    row.append(left, addButton)
    list.appendChild(row)
  })

  document.getElementById("bascybros-close")?.addEventListener("click", () => panel.remove())

  list.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-index]") as HTMLElement | null
    if (!btn) return
    const index = parseInt(btn.getAttribute("data-index")!)
    captureItem(findings[index])
    btn.textContent = "✓"
    ;(btn as HTMLButtonElement).disabled = true
  })

  captureAllBtn.addEventListener("click", () => {
    findings.forEach(captureItem)
    panel.remove()
  })
}

function captureItem(item: { type: string; text: string }) {
  const msg = item.type === "command"
    ? { type: "CREATE_COMMAND" as const, payload: { commandText: item.text, description: "Captured from page" } }
    : { type: "CREATE_NOTE" as const, payload: { title: item.text.slice(0, 80), contentMarkdown: item.text } }
  chrome.runtime.sendMessage(msg)
}

const findings = scanPage()
injectBadge(findings)
