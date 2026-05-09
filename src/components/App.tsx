import { useState } from "react"
import { Toaster, toast } from "sonner"
import { FileText, Link, Terminal, Code2, CheckSquare, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~components/ui/tabs"
import { CaptureForm } from "~components/CaptureForm"
import { SearchBar } from "~components/SearchBar"
import { ConnectionStatus } from "~components/ConnectionStatus"
import { sendBridgeMessage } from "~lib/api-client"

type CaptureType = "note" | "resource" | "command" | "snippet" | "task"

export function App() {
  const [mode, setMode] = useState<"capture" | "search">("capture")
  const [activeTab, setActiveTab] = useState<CaptureType>("note")

  async function handleCapture(data: {
    type: CaptureType | "CREATE_SNIPPET" | "CREATE_TASK"
    payload: Record<string, string>
  }) {
    const msgType = data.type === "snippet" ? "CREATE_SNIPPET" : data.type === "task" ? "CREATE_TASK" : `CREATE_${data.type.toUpperCase()}`
    try {
      const response = await sendBridgeMessage(msgType, data.payload)
      if (response.ok) {
        toast.success(`${data.type} saved`)
      } else {
        toast.error(response.message ?? "Failed")
      }
    } catch {
      toast.error("Network error — is the bridge server running?")
    }
  }

  return (
    <div>
      <Toaster position="bottom-center" richColors />

      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setMode("capture")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "capture" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Capture
          </button>
          <button
            onClick={() => setMode("search")}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "search" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Search
          </button>
        </div>
        <ConnectionStatus />
      </div>

      {mode === "capture" ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CaptureType)} className="p-3">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="note" className="gap-1">
              <FileText className="w-3.5 h-3.5" />Note
            </TabsTrigger>
            <TabsTrigger value="resource" className="gap-1">
              <Link className="w-3.5 h-3.5" />Link
            </TabsTrigger>
            <TabsTrigger value="command" className="gap-1">
              <Terminal className="w-3.5 h-3.5" />Cmd
            </TabsTrigger>
            <TabsTrigger value="snippet" className="gap-1">
              <Code2 className="w-3.5 h-3.5" />Code
            </TabsTrigger>
            <TabsTrigger value="task" className="gap-1">
              <CheckSquare className="w-3.5 h-3.5" />Task
            </TabsTrigger>
          </TabsList>
          {(["note", "resource", "command", "snippet", "task"] as CaptureType[]).map((type) => (
            <TabsContent key={type} value={type}>
              <CaptureForm type={type} onCapture={handleCapture} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="p-3">
          <SearchBar />
        </div>
      )}
    </div>
  )
}
