'use client'

import { FollowUpItem } from '@/src/types'
import Link from 'next/link'

interface Props {
  itens: FollowUpItem[]
}

const CATEGORIA_LABEL: Record<FollowUpItem['categoria'], string> = {
  NOVO_LEAD: 'Novo Lead',
  SEM_CONTATO: 'Sem contato',
  AGUARDANDO_RETORNO: 'Aguardando',
  VENCIDO: 'Vencido',
  ESQUECIDO: 'Esquecido',
}

const CATEGORIA_COR: Record<FollowUpItem['categoria'], string> = {
  NOVO_LEAD: 'bg-blue-50 border-blue-200',
  SEM_CONTATO: 'bg-amber-50 border-amber-200',
  AGUARDANDO_RETORNO: 'bg-gray-50 border-gray-200',
  VENCIDO: 'bg-red-50 border-red-200',
  ESQUECIDO: 'bg-red-100 border-red-300',
}

/** Seção 1 — Caixa de Entrada ordenada por prioridade */
export default function FollowUpCaixaEntrada({ itens }: Props) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Caixa de Entrada ({itens.length})
        </h2>
        <span className="text-[10px] text-gray-400">Ordenado por prioridade</span>
      </div>

      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Caixa vazia — nenhum lead pendente!</p>
      ) : (
        <div className="mt-3 max-h-[500px] overflow-y-auto space-y-2">
          {itens.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/clientes/${item.clienteId}`}
              className={`flex items-center gap-3 rounded-lg border p-3 hover:shadow-md transition-shadow ${CATEGORIA_COR[item.categoria]}`}
            >
              {/* Prioridade bar */}
              <div className="flex h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-red-500 to-yellow-400 relative overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-gray-200 transition-all"
                  style={{ height: `${100 - (item.prioridade / 10)}%` }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{item.nome}</span>
                  <span className="text-xs">{item.statusEmoji}</span>
                  <span className="ml-auto shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    {CATEGORIA_LABEL[item.categoria]}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span>{item.etapaLabel}</span>
                  <span>📞 {item.telefone}</span>
                  <span>👤 {item.corretorNome}</span>
                </div>
                {item.alerta && (
                  <p className="mt-0.5 text-[11px] font-medium text-red-600">{item.alerta}</p>
                )}
                {item.proximaAcao && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Próx: {item.proximaAcao} {item.proximaAcaoEm ? `· ${new Date(item.proximaAcaoEm).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <span className="text-lg font-bold text-gray-700">{item.prioridade}</span>
                <span className="block text-[10px] text-gray-400">pts</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}