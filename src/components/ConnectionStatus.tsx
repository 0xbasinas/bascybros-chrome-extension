import { useEffect, useState } from "react"
import { apiClient } from "~lib/api-client"
import { Badge } from "~components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"

export function ConnectionStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking")

  useEffect(() => {
    apiClient.checkHealth().then((r) => {
      setStatus(r.status === "ok" ? "connected" : "disconnected")
    })
  }, [])

  return (
    <Badge variant={status === "connected" ? "outline" : "destructive"} className="gap-1">
      {status === "checking" ? (
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
      ) : status === "connected" ? (
        <Wifi className="w-3 h-3 text-green-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-destructive" />
      )}
      {status === "connected" ? "Live" : status === "checking" ? "..." : "Offline"}
    </Badge>
  )
}
