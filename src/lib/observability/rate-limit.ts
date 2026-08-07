// DNA CRM v2 — Rate limiter in-memory
// Limpa automaticamente a cada janela de tempo.

const buckets = new Map<string, { count: number; resetAt: number }>()

const DEFAULT_WINDOW_MS = 60_000 // 1 minuto
const DEFAULT_MAX = 30 // 30 requests por minuto

export function createRateLimiter(opts?: { windowMs?: number; max?: number }) {
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS
  const max = opts?.max ?? DEFAULT_MAX

  return function check(key: string): boolean {
    const now = Date.now()
    const existing = buckets.get(key)

    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (existing.count >= max) {
      return false
    }

    existing.count++
    return true
  }
}

/** Limpador periódico para evitar crescimento do Map */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of buckets) {
      if (now > val.resetAt) buckets.delete(key)
    }
  }, 60_000)
}

export const authRateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 })
export const apiRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })
export const reportsRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })