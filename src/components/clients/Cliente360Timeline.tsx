'use client'

import { Cliente360Evento } from '@/src/types'

interface Props {
  timeline: Cliente360Evento[]
}

const ICONES: Record<Cliente360Evento['tipo'], { icone: string; cor: string }> = {
  CADASTRO: { icone: '👤', cor: 'bg-blue-100 text-blue-700' },
  LIGACAO: { icone: '📞', cor: 'bg-green-100 text-green-700' },
  WHATSAPP: { icone: '💬', cor: 'bg-emerald-100 text-emerald-700' },
  AGENDAMENTO: { icone: '📅', cor: 'bg-purple-100 text-purple-700' },
  COMPARECIMENTO: { icone: '🚶', cor: 'bg-indigo-100 text-indigo-700' },
  MUDANCA_ETAPA: { icone: '🔄', cor: 'bg-amber-100 text-amber-700' },
  DOCUMENTO: { icone: '📄', cor: 'bg-gray-100 text-gray-700' },
  ANALISE: { icone: '🔍', cor: 'bg-teal-100 text-teal-700' },
  OBSERVACAO: { icone: '📝', cor: 'bg-orange-100 text-orange-700' },
  CONTRATO: { icone: '✍️', cor: 'bg-rose-100 text-rose-700' },
  POS_VENDA: { icone: '🏠', cor: 'bg-cyan-100 text-cyan-700' },
}

const TIPO_LABEL: Record<Cliente360Evento['tipo'], string> = {
  CADASTRO: 'Cadastro', LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', AGENDAMENTO: 'Agendamento',
  COMPARECIMENTO: 'Comparecimento', MUDANCA_ETAPA: 'Mudança de etapa', DOCUMENTO: 'Documento',
  ANALISE: 'Análise', OBSERVACAO: 'Observação', CONTRATO: 'Contrato', POS_VENDA: 'Pós-venda',
}

/** Seção 2 — Timeline cronológica completa */
export default function Cliente360Timeline({ timeline }: Props) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Timeline ({timeline.length} eventos)
      </h2>
      {timeline.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Nenhum evento registrado.</p>
      ) : (
        <div className="mt-3 max-h-96 overflow-y-auto pr-1">
          <div className="relative ml-3 border-l-2 border-gray-200 dark:border-gray-600 pl-6 space-y-4">
            {timeline.map((ev, i) => {
              const { icone, cor } = ICONES[ev.tipo]
              return (
                <div key={`${ev.data}-${ev.tipo}-${i}`} className="relative">
                  {/* Bolinha colorida */}
                  <span className={`absolute -left-[29px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${cor}`}>
                    {icone}
                  </span>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(ev.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {ev.hora ? ` · ${ev.hora}` : ''}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        <span className={`mr-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${cor}`}>
                          {TIPO_LABEL[ev.tipo]}
                        </span>
                        {ev.descricao}
                      </p>
                      {ev.detalhes && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{ev.detalhes}</p>
                      )}
                      {ev.usuarioNome && (
                        <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">por {ev.usuarioNome}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}