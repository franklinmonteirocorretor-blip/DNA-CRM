// DNA CRM v2 — Tracing middleware
// Adiciona X-Request-Id a todas as respostas para tracing distribuído

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const start = Date.now()

  const response = NextResponse.next()

  response.headers.set('x-request-id', requestId)
  response.headers.set('x-response-time', `${Date.now() - start}ms`)

  // Log estruturado no servidor
  if (process.env.NODE_ENV !== 'test') {
    console.log(
      JSON.stringify({
        level: 'info',
        message: `${request.method} ${request.nextUrl.pathname}`,
        timestamp: new Date().toISOString(),
        context: {
          method: request.method,
          path: request.nextUrl.pathname,
          status: response.status,
          requestId,
          duration: Date.now() - start,
        },
      })
    )
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/auth/:path*'],
}