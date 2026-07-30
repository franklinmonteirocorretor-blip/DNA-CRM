// DNA CRM — Sprint 13
// POST /api/automation/process — Processamento da fila de automações
// Chamar via cron job (ex: Vercel Cron ou pg_cron)

import { NextResponse } from 'next/server'
import { dispatchProcessarFila } from '@/src/lib/automation/engine'
import { logger } from '@/src/utils/logger'

export async function POST() {
  try {
    const resultado = await dispatchProcessarFila()
    return NextResponse.json({
      sucesso: true,
      processados: resultado.processados,
      erros: resultado.erros,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    logger.error('Erro ao processar fila de automações', {
      error: err?.message ?? 'Erro interno',
      stack: err?.stack,
    })
    return NextResponse.json(
      { sucesso: false, erro: err?.message ?? 'Erro interno' },
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