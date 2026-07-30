// DNA CRM — RC1: Classes de erro padronizadas para todo o projeto
// Extensíveis, com códigos HTTP e mensagens amigáveis

export class AppError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly userMessage: string
  public readonly details?: unknown

  constructor(message: string, options?: {
    status?: number
    code?: string
    userMessage?: string
    details?: unknown
  }) {
    super(message)
    this.name = this.constructor.name
    this.status = options?.status ?? 500
    this.code = options?.code ?? 'INTERNAL_ERROR'
    this.userMessage = options?.userMessage ?? 'Ocorreu um erro inesperado. Tente novamente.'
    this.details = options?.details
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} "${id}" não encontrado(a)` : `${resource} não encontrado(a)`
    super(msg, {
      status: 404,
      code: 'NOT_FOUND',
      userMessage: id
        ? `O ${resource.toLowerCase()} que você procura não foi encontrado.`
        : 'Recurso não encontrado.',
    })
  }
}

export class ValidationError extends AppError {
  public readonly violations: Array<{ field: string; message: string }>
  constructor(message: string, violations: Array<{ field: string; message: string }> = []) {
    super(message, {
      status: 422,
      code: 'VALIDATION_ERROR',
      userMessage: 'Os dados enviados são inválidos. Verifique e tente novamente.',
    })
    this.violations = violations
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Acesso não autorizado') {
    super(message, {
      status: 403,
      code: 'FORBIDDEN',
      userMessage: 'Você não tem permissão para acessar este recurso.',
    })
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Sessão expirada') {
    super(message, {
      status: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Sua sessão expirou. Faça login novamente.',
    })
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string) {
    super(`Timeout: ${operation}`, {
      status: 504,
      code: 'TIMEOUT',
      userMessage: `A operação "${operation}" expirou. Verifique sua conexão e tente novamente.`,
    })
  }
}