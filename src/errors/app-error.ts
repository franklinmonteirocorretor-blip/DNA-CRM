// DNA CRM — RC1: Hierarquia de erros padronizada
// Inspiração: BaseError → AppError → ValidationError, NotFoundError, etc.
// Usado em: Server Actions, Route Handlers, Automation Engine.

/**
 * Códigos de erro internos (sugestão para logging/monitoramento)
 */
export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'AUTOMATION_FAILURE'
  | 'TRANSACTION_FAILURE'
  | 'RATE_LIMIT'
  | 'INTERNAL'

/**
 * Código HTTP correspondente
 */
export const errorToHttpStatus: Record<ErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  AUTOMATION_FAILURE: 500,
  TRANSACTION_FAILURE: 500,
  RATE_LIMIT: 429,
  INTERNAL: 500,
}

/**
 * Hierarquia de classes de erro
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly cause?: unknown
  public readonly details?: Record<string, unknown>

  constructor(message: string, code: ErrorCode, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = options?.cause
    this.details = options?.details

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION', { details })
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso proibido') {
    super(message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class AutomationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTOMATION_FAILURE', { cause })
    this.name = 'AutomationError'
  }
}

export class TransactionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'TRANSACTION_FAILURE', { cause })
    this.name = 'TransactionError'
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Aguarde.') {
    super(message, 'RATE_LIMIT')
    this.name = 'RateLimitError'
  }
}

/**
 * Helper: convert qualquer error para um AppError.
 * Usado em catch blocks de server actions.
 */
export function toAppError(err: unknown, fallbackCode: ErrorCode = 'INTERNAL'): AppError {
  if (err instanceof AppError) return err
  if (err instanceof Error) return new AppError(err.message, fallbackCode, { cause: err })
  return new AppError(String(err), 'INTERNAL')
}

/**
 * Helper: serializa AppError para JSON seguro (sem stack trace interno).
 */
export function serializeAppError(err: AppError) {
  return {
    error: {
      message: err.message,
      code: err.code,
      status: errorToHttpStatus[err.code],
      details: err.details,
    },
  }
}