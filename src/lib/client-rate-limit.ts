const DEFAULT_MAX_REQUESTS = 40
const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MIN_INTERVAL_MS = 150

export function createClientRateLimiter(options?: {
  maxRequests?: number
  windowMs?: number
  minIntervalMs?: number
}) {
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS
  const minIntervalMs = options?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS

  const timestamps: number[] = []
  let lastRequestAt = 0
  let queue: Promise<void> = Promise.resolve()

  function prune(now: number) {
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift()
    }
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
  }

  return {
    acquire(): Promise<void> {
      queue = queue.then(async () => {
        const now = Date.now()
        prune(now)

        const spacing = minIntervalMs - (now - lastRequestAt)
        if (spacing > 0) await wait(spacing)

        const afterSpacing = Date.now()
        prune(afterSpacing)

        if (timestamps.length >= maxRequests) {
          const waitMs = timestamps[0] + windowMs - afterSpacing
          if (waitMs > 0) await wait(waitMs)
          prune(Date.now())
        }

        const stamp = Date.now()
        timestamps.push(stamp)
        lastRequestAt = stamp
      })

      return queue
    },
  }
}

export function parseRetryAfterSeconds(
  response: Response,
  body?: { retryAfter?: number }
): number | null {
  const header = response.headers.get("retry-after")
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)
  }
  if (body?.retryAfter && body.retryAfter > 0) return Math.ceil(body.retryAfter)
  return null
}
