# BascyBros Chrome Extension

[Plasmo](https://docs.plasmo.com/) Manifest V3 extension that captures cybersecurity notes, shell commands, URLs, snippets, tasks, and screenshots from the browser into your [BascyBros](https://github.com/0xbasinas/bascybros) workspace.

Authenticated via [Clerk for Chrome extensions](https://clerk.com/docs/quickstarts/chrome-extension). API calls go to the [bridge server](https://github.com/0xbasinas/bascybros_bridge_server), not the Next.js app directly.

## Related repos

| Repo | Role |
|------|------|
| [bascybros_bridge_server](https://github.com/0xbasinas/bascybros_bridge_server) | REST + WebSocket backend for this extension |
| [bascybros](https://github.com/0xbasinas/bascybros) | Web dashboard |
| [bascybrosmobile](https://github.com/0xbasinas/bascybrosmobile) | Mobile companion (Next.js APIs) |

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local env files (gitignored; do not commit private keys). Typical variables:

   | Variable | Purpose |
   |----------|---------|
   | `PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
   | `PLASMO_PUBLIC_CLERK_SYNC_HOST` | Clerk sync host for extension auth |
   | `PLASMO_PUBLIC_BRIDGE_URL` | Bridge API origin (default `http://localhost:8787`) |

   Plasmo manifest placeholders (`$CRX_PUBLIC_KEY`, `$CLERK_FRONTEND_API`, etc.) are documented in `package.json` under `manifest`.

3. Start the [bridge server](https://github.com/0xbasinas/bascybros_bridge_server), then run the extension:

   ```bash
   pnpm dev
   ```

   Load `build/chrome-mv3-dev` in Chrome (Extensions → Developer mode → Load unpacked).

## Scripts

```bash
pnpm dev            # plasmo dev
pnpm build          # production build
pnpm build:chrome   # chrome-mv3 target
pnpm build:firefox  # firefox-mv3 target
pnpm package        # zip for store upload
pnpm typecheck
```

## Production build

```bash
pnpm build
```

Output is under `build/` (e.g. `chrome-mv3-prod.zip` after packaging).

## Store submission

The repo includes `.github/workflows/submit.yml` for [Browser Platform Publish](https://bpp.browser.market) using the `SUBMIT_KEYS` repository secret. See [Plasmo submit docs](https://docs.plasmo.com/framework/workflows/submit) for first-time store setup.

## Development

Edit the popup in `src/popup.tsx`. The service worker (`src/background.ts`) handles context menus, keyboard shortcuts, screenshots, and bridge API calls. Content scripts target common security-learning sites (TryHackMe, HTB, PortSwigger, etc.).

For more Plasmo guidance, see the [Plasmo documentation](https://docs.plasmo.com/).
