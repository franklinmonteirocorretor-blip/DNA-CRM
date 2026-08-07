// ─── Cron-secure endpoint (Sprint 18 — Deploy) ───────────────────────────────
// Chamado pelo Vercel Cron Job (vercel.json). Usa SUPABASE_SERVICE_ROLE_KEY
// pois cron jobs não possuem sessão de usuário.
// Autenticado via header `x-cron-secret` (CRON_SECRET no ambiente).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // Verificação do segredo do cron — impede que qualquer um dispare o processamento
    const secretoEsperado = process.env.CRON_SECRET ?? process.env.VERCEL_CRON_SECRET
    const secretoRecebido = request.headers.get('x-cron-secret')
    if (!secretoEsperado || !secretoRecebido || secretoRecebido !== secretoEsperado) {
      return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Claims up to 50 pending automation items and processes them
    const { data, error } = await supabase.rpc('fn_automacao_claim_fila')
    if (error) throw error

    return NextResponse.json({ ok: true, processados: data?.length ?? 0 })
  } catch (erro: unknown) {
    console.error('[Cron] Erro ao processar automações:', erro)
    return NextResponse.json(
      { ok: false, erro: (erro as Error)?.message ?? 'Erro desconhecido' },
      { status: 500 }
    )
  }
}