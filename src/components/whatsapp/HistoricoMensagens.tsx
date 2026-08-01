// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Histórico de mensagens (timeline) — componente usado internamente no Chat.

'use client'

import type { WhatsAppMensagem } from '@/src/types/whatsapp'

interface HistoricoProps {
  mensagens: WhatsAppMensagem[]
}

export function HistoricoMensagens({ mensagens }: HistoricoProps) {
  if (mensagens.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">Nenhuma mensagem ainda.</p>
    )
  }

  const agrupadasPorData = mensagens.reduce((acc, m) => {
    const data = new Date(m.enviada_em).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    if (!acc[data]) acc[data] = []
    acc[data].push(m)
    return acc
  }, {} as Record<string, WhatsAppMensagem[]>)

  const datas = Object.keys(agrupadasPorData).sort((a, b) => {
    const fa = agrupadasPorData[a][0].enviada_em
    const fb = agrupadasPorData[b][0].enviada_em
    return fa.localeCompare(fb)
  })

  return (
    <div className="space-y-6">
      {datas.map(data => (
        <div key={data}>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-600" />
            <span className="text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">{data}</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-600" />
          </div>
          <div className="space-y-3">
            {agrupadasPorData[data].map(m => (
              <div key={m.id} className="flex items-start gap-3 px-4">
                <div className={`mt-1 h-2 w-2 rounded-full ${ m.remetente === 'usuario' ? 'bg-blue-500' : m.remetente === 'cliente' ? 'bg-green-500' : 'bg-gray-400' }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {m.remetente === 'usuario' ? 'Você' :
                     m.remetente === 'cliente' ? 'Cliente' : 'Sistema'}
                    {' · '}
                    {new Date(m.enviada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{m.texto}</p>
                  {m.media_url && (
                    <p className="mt-1 text-xs text-blue-600">📎 Anexo: {m.tipo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}