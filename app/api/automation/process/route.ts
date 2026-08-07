// DNA CRM — Sprint 13
// POST /api/automation/process — Processamento da fila de automações
// Chamar via cron job (ex: Vercel Cron ou pg_cron)

import { NextResponse } from 'next/server'
import { requireRole } from '@/src/lib/auth/guards'
import { dispatchProcessarFila } from '@/src/lib/automation/engine'
import { logger } from '@/src/utils/logger'

export async function POST() {
  try {
    // Apenas GERENTE/ADMINISTRADOR podem disparar o processamento manualmente
    await requireRole('GERENTE')
  } catch {
    return NextResponse.json(
      { sucesso: false, erro: 'Não autorizado' },
      { status: 403 },
    )
  }

  try {
    const resultado = await dispatchProcessarFila()
    return NextResponse.json({
      sucesso: true,
      processados: resultado.processados,
      erros: resultado.erros,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    logger.error('Erro ao processar fila de automações', {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json(
      { sucesso: false, erro: message },
      { status: 500 },
    )
  }
}

// Também aceito GET para facilitar testes e health check
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    dica: 'Use POST para processar a fila de automações',
    timestamp: new Date().toISOString(),
  })
}