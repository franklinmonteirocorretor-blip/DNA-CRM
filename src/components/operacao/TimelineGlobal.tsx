'use client'

// ─── Timeline Global (Sprint 14) ──────────────────────────────────────────
// Feed em tempo real com atualização automática via Supabase Realtime.
// Mostra as últimas atividades de todos os corretores.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/src/lib/supabase'
import Link from 'next/link'
import { SectionHeader } from '@/src/components/ui/SectionHeader'

interface TimelineEvent {
  id: string
  created_at: string
  tipo: string
  resultado: string | null
  usuarioNome: string
  clienteNome: string
  clienteId: string
  etapaAtual: string | null
  empreendimentoInteresse: string | null
}

const TIPO_ACAO: Record<string, string> = {
  LIGACAO: 'ligou para',
  WHATSAPP: 'conversou via WhatsApp com',
  FOLLOW_UP: 'fez follow-up com',
  AGENDAMENTO: 'agendou',
  COMPARECIMENTO: 'registrou comparecimento de',
  CADASTRO: 'cadastrou',
  ANALISE: 'iniciou análise de',
  APROVACAO: 'aprovou',
  FECHAMENTO: 'fechou venda com',
  VENDA: 'vendeu para',
}

interface TimelineGlobalProps {
  eventosIniciais: TimelineEvent[]
}

export default function TimelineGlobal({ eventosIniciais }: TimelineGlobalProps) {
  const [eventos, setEventos] = useState<TimelineEvent[]>(eventosIniciais)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canal = supabase
      .channel('timeline-global-v2')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'atividades' },
        async (payload: { new: Record<string, unknown> }) => {
          const nova = payload.new as Record<string, unknown>
          const [{ data: usr }, { data: cli }] = await Promise.all([
            supabase.from('usuarios').select('nome').eq('id', nova.usuario_id).single(),
            supabase.from('clientes').select('nome, etapa_atual, empreendimento_interesse').eq('id', nova.cliente_id).single(),
          ])
          setEventos((prev) => [{
            id: nova.id as string,
            created_at: nova.created_at as string,
            tipo: nova.tipo as string,
            resultado: nova.resultado as string | null,
            usuarioNome: (usr as { nome: string } | null)?.nome ?? '',
            clienteNome: (cli as { nome: string } | null)?.nome ?? '',
            clienteId: nova.cliente_id as string,
            etapaAtual: (cli as { etapa_atual: string } | null)?.etapa_atual ?? null,
            empreendimentoInteresse: (cli as { empreendimento_interesse: string } | null)?.empreendimento_interesse ?? null,
          }, ...prev].slice(0, 100))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  return (
    <section>
      <SectionHeader title="Timeline Global" subtitle={
        <><span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1" />Feed em tempo real — novas atividades aparecem automaticamente</>
      } />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div ref={containerRef} className="max-h-96 overflow-y-auto scroll-smooth">
          {eventos.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">Nenhuma atividade registrada.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {eventos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-xs">
                  <span className="w-12 shrink-0 tabular-nums text-gray-400 dark:text-gray-500">
                    {new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="w-20 shrink-0 font-medium text-gray-700 dark:text-gray-200 truncate">
                    {a.usuarioNome.split(' ')[0]}
                  </span>
                  <span className="flex-1 text-gray-500 dark:text-gray-400 truncate">
                    {TIPO_ACAO[a.tipo] ?? 'interagiu com'}{' '}
                    <Link href={`/dashboard/clientes/${a.clienteId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {a.clienteNome}
                    </Link>
                    {a.resultado ? <span className="text-gray-400 dark:text-gray-500"> — {a.resultado}</span> : null}
                  </span>
                  {a.etapaAtual ? (
                    <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 shrink-0">
                      {a.etapaAtual}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}