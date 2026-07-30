'use client'

import Link from 'next/link'

interface Acao {
  clienteId: string
  clienteNome: string
  acao: string
  motivo: string
  score: number
  prazo: string | null
  etapa: string
  corretor: string
}

interface FilaTrabalhoProps {
  acoes: Acao[]
}

function corScore(score: number): string {
  if (score >= 500) return 'text-green-600 border-green-300 bg-green-50'
  if (score >= 300) return 'text-yellow-600 border-yellow-300 bg-yellow-50'
  return 'text-red-600 border-red-300 bg-red-50'
}

function formatarPrazo(prazo: string | null): string {
  if (!prazo) return ''
  const data = new Date(prazo)
  const agora = new Date()
  const diff = data.getTime() - agora.getTime()

  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)

  if (minutos < 0) return `${Math.abs(dias)}d atrasado`
  if (minutos < 60) return `${minutos}min`
  if (horas < 24) return `${horas}h`
  return `${dias}d`
}

export default function FilaTrabalho({ acoes }: FilaTrabalhoProps) {
  const ordenadas = [...acoes].sort((a, b) => b.score - a.score).slice(0, 10)

  if (!ordenadas.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
        Tudo em dia! Nenhuma ação pendente. 🙂
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Fila de Trabalho</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {ordenadas.map((acao, idx) => {
          const prioridade = idx + 1
          return (
            <Link
              key={acao.clienteId}
              href={`/dashboard/clientes/${acao.clienteId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* Score circle */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${corScore(acao.score)}`}
              >
                {acao.score}
              </div>

              {/* Info central */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {acao.clienteNome}
                  </span>
                  {prioridade <= 3 && (
                    <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full px-1.5 py-0.5 leading-none">
                      {prioridade}º
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-gray-500">{acao.acao}</span>
                  <span className="text-[10px] text-gray-300">•</span>
                  <span className="text-[11px] text-gray-400">{acao.etapa}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {acao.corretor} — {acao.motivo}
                </p>
              </div>

              {/* Prazo */}
              {acao.prazo && (
                <div className="flex items-center gap-1 shrink-0 text-[11px] text-gray-400">
                  <span>⌛</span>
                  <span>{formatarPrazo(acao.prazo)}</span>
                </div>
              )}
            </Link>
          )
        })}
      </div>
      {acoes.length > 10 && (
        <div className="px-4 py-2 text-center text-[11px] text-gray-400 bg-gray-50 border-t border-gray-100">
          +{acoes.length - 10} ações restantes
        </div>
      )}
    </div>
  )
}