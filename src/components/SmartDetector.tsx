import { useEffect, useState } from "react"

interface Props { children: React.ReactNode }

export function SmartDetector({ children }: Props) {
  const [selectedText, setSelectedText] = useState<string | null>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab?.id) return
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? "",
      }).then(([result]) => {
        if (result?.result) setSelectedText(result.result)
      })
    })
  }, [])

  return (
    <>
      {selectedText && (
        <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded-md text-xs text-muted-foreground">
          <span className="font-medium text-primary">Filled from selection</span>
          <span className="block mt-0.5 truncate">{selectedText.slice(0, 100)}</span>
        </div>
      )}
      {children}
    </>
  )
}
