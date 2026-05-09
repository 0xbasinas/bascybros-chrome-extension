import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/chrome-extension"

import { App } from "~components/App"
import { Button } from "~components/ui/button"

import "~style.css"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const SYNC_HOST = process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST
const EXTENSION_URL = chrome.runtime.getURL(".")

if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Missing PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.development"
  )
}

function IndexPopup() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY!}
      syncHost={SYNC_HOST!}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <div className="flex flex-col w-[360px] min-h-[400px] bg-background text-foreground">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-lg font-bold">BascyBros</h1>
          <Show when="signed-out">
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign Up</Button>
              </SignUpButton>
            </div>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>

        <main className="flex-1">
          <Show when="signed-out">
            <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
              <p>Sign in to capture notes, commands, and resources to your BascyBros dashboard.</p>
            </div>
          </Show>
          <Show when="signed-in">
            <App />
          </Show>
        </main>
      </div>
    </ClerkProvider>
  )
}

export default IndexPopup
