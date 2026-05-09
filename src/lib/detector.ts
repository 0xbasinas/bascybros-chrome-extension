export function detectContentType(text: string): { type: "note" | "command" | "resource" | "url" } {
  if (/^https?:\/\/\S+/i.test(text.trim())) {
    return { type: "url" }
  }
  if (/^[$#>]\s/.test(text.trim()) || /^(nmap|gobuster|sqlmap|hydra|ffuf|dirb|nikto|msfconsole|python|curl|wget|ssh|nc|netcat|tcpdump|wireshark|burp)\b/i.test(text.trim())) {
    return { type: "command" }
  }
  return { type: "note" }
}
