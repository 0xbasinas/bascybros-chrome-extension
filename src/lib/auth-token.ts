import { createClerkClient } from "@clerk/chrome-extension/client"

const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

export async function getClerkToken(): Promise<string | null> {
  if (!publishableKey) return null
  try {
    const clerk = await createClerkClient({ publishableKey, background: true })
    if (!clerk.session) return null
    return await clerk.session.getToken()
  } catch {
    return null
  }
}
