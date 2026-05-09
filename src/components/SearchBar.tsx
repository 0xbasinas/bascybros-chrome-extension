import { useState } from "react"
import { Search, ExternalLink } from "lucide-react"
import { sendBridgeMessage } from "~lib/api-client"
import { Input } from "~components/ui/input"
import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"

const TYPE_ICONS: Record<string, string> = {
  note: "N", resource: "R", command: "C", snippet: "S", task: "T"
}

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const response = await sendBridgeMessage("SEARCH", { query: query.trim() })
      if (response.ok) setResults(response.results ?? [])
    } finally { setLoading(false) }
  }

  function openInDashboard(_id: string, type: string) {
    chrome.tabs.create({ url: `http://localhost:3000/${type}s` })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your workspace..."
          className="flex-1" />
        <Button type="submit" size="icon" variant="outline" disabled={!query.trim()}>
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {loading && <div className="text-center text-sm text-muted-foreground py-4">Searching...</div>}

      {!loading && results.length > 0 && (
        <ul className="space-y-1 max-h-[280px] overflow-y-auto">
          {results.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <button
                onClick={() => openInDashboard(r.id, r.type)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 group">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {TYPE_ICONS[r.type] || "?"}
                </Badge>
                <span className="text-sm truncate flex-1">{r.title}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">No results</div>
      )}
    </div>
  )
}
