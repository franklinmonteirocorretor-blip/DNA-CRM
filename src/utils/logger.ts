// DNA CRM — RC2: Logger centralizado
// Substitui console.error/console.warn soltos. Em produção, pode ser
// integrado a Sentry, DataDog, ou outro APM.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

function formatEntry(entry: LogEntry): string {
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${ctx}`
}

function emit(entry: LogEntry): void {
  const formatted = formatEntry(entry)
  switch (entry.level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(formatted)
      }
      break
  }

  // Hook para enviar a um APM externo (Sentry, etc.)
  // if (typeof window === 'undefined' && process.env.SENTRY_DSN) { ... }
}

/**
 * Loga um erro com contexto. Uso:
 *   logger.error('Falha ao processar fila', { filaId: '123', error: err.message })
 */
export const logger = {
  error(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'error', message, context, timestamp: new Date().toISOString() })
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'warn', message, context, timestamp: new Date().toISOString() })
  },
  info(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'info', message, context, timestamp: new Date().toISOString() })
  },
  debug(message: string, context?: Record<string, unknown>): void {
    emit({ level: 'debug', message, context, timestamp: new Date().toISOString() })
  },
}