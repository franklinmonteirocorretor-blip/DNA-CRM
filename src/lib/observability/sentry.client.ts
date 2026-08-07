// DNA CRM v2 — Sentry client configuration
// Instrumentação mínima para capturar erros em produção

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: !!SENTRY_DSN && process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV ?? 'development',
  beforeSend(event) {
    if (event.request?.url?.includes('/api/health')) return null
    return event
  },
})