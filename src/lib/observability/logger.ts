// DNA CRM v2 — Logging estruturado
// Uso: logger.info('Rota acessada', { userId, path })
//       logger.error('Erro ao buscar clientes', { error: err.message })

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function logFn(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: context ?? {},
  }

  const output = formatEntry(entry)

  switch (level) {
    case 'debug':
      console.debug(output)
      break
    case 'info':
      console.info(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'error':
      console.error(output)
      break
    default:
      console.log(output)
  }

  // Em produção, poderia enviar para: Sentry, Datadog, CloudWatch, etc.
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => logFn('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => logFn('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => logFn('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => logFn('error', message, context),
}

export type Logger = typeof logger