// DNA CRM — Sprint 14: Página BI Executivo (Server Component)
// Carrega todos os dados no servidor e passa para o client component de visualização.

import { redirect } from 'next/navigation'
import { requireRole } from '@/src/lib/auth/guards'
import { queryBIDadosCompletos } from '@/src/lib/server/queries-bi-aggregator'
import BIDashboardClient from './bi-client'

export const dynamic = 'force-dynamic'

export default async function BIPage() {
  try {
    // Defesa em profundidade: além do middleware, a página exige perfil de supervisão
    await requireRole('SUPERVISOR')
  } catch {
    redirect('/dashboard')
  }

  const dados = await queryBIDadosCompletos()

  return <BIDashboardClient dados={dados} />
}