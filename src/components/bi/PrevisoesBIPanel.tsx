'use client'

import type { BIPrevisao, BIHorizonteMeta, BIClientePrevisao } from '@/src/types/bi'

function formatoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatoPercentual(valor: number): string {
  return Math.round(valor) + '%'
}

const CORES_CENARIO: Record<string, string> = {
  Otimista: 'border-emerald-300 bg-emerald-50',
  Pessimista: 'border-red-300 bg-red-50',
  Realista: 'border-blue-300 bg-blue-50',
}

const CORES_CENARIO_TEXTO: Record<string, string> = {
  Otimista: 'text-emerald-700',
  Pessimista: 'text-red-700',
  Realista: 'text-blue-700',
}

function HorizonCard({ cenario }: { cenario: BIHorizonteMeta }) {
  const cardStyle = CORES_CENARIO[cenario.cenario] ?? 'border-gray-200 bg-gray-50'
  const textStyle = CORES_CENARIO_TEXTO[cenario.cenario] ?? 'text-gray-500'

  return (
    <div className={`rounded-lg border-2 ${cardStyle} p-4 shadow-sm`}>
      <p className={`text-sm font-semibold ${textStyle}`}>{cenario.cenario}</p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Vendas necessárias</span>
          <span className="font-semibold text-gray-800">{cenario.vendasNecessarias}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Ticket médio</span>
          <span className="font-semibold text-gray-800">{formatoMoeda(cenario.ticketMedioNecessario)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Probabilidade</span>
          <span className="font-semibold text-gray-800">{formatoPercentual(cenario.probabilidade)}</span>
        </div>
      </div>
    </div>
  )
}

function ClienteLinha({
  cliente,
  isRisco,
}: {
  cliente: BIClientePrevisao
  isRisco: boolean
}) {
  return (
    <tr className="border-b border-gray-100 text-xs text-gray-700">
      <td className="py-2 pr-3">{cliente.nome}</td>
      <td className="py-2 pr-3">{cliente.etapaLabel}</td>
      <td className="py-2 pr-3">{cliente.corretor}</td>
      <td className="py-2 pr-3 text-right">
        {cliente.vgv != null ? formatoMoeda(cliente.vgv) : '—'}
      </td>
      <td className="py-2 pr-3 text-right font-medium">
        {formatoPercentual(cliente.probabilidade)}
      </td>
      <td className="py-2 text-right">
        <span
          className={`inline-flex items-center gap-1 ${isRisco && cliente.diasNaEtapa > 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}
        >
          {isRisco && cliente.diasNaEtapa > 7 && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          )}
          {cliente.diasNaEtapa} {cliente.diasNaEtapa === 1 ? 'dia' : 'dias'}
        </span>
      </td>
    </tr>
  )
}

export default function PrevisoesBIPanel({
  previsoes,
}: {
  previsoes: BIPrevisao
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm border p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Previsões</h3>
        <div className="flex gap-2 text-xs text-gray-500">
          <span>VGV esperado: {formatoMoeda(previsoes.vgvEsperado)}</span>
          <span>|</span>
          <span>Comissão: {formatoMoeda(previsoes.comissaoEsperada)}</span>
          <span>|</span>
          <span>Fechamentos: {previsoes.fechamentosEsperados} clientes</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {previsoes.metaProvavel.map((c, i) => (
          <HorizonCard key={i} cenario={c} />
        ))}
      </div>

      {previsoes.clientesAltaProbabilidade.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Clientes com alta probabilidade
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Etapa</th>
                  <th className="py-2 pr-3 font-medium">Corretor</th>
                  <th className="py-2 pr-3 font-medium text-right">VGV</th>
                  <th className="py-2 pr-3 font-medium text-right">Prob.</th>
                  <th className="py-2 font-medium text-right">Dias</th>
                </tr>
              </thead>
              <tbody>
                {previsoes.clientesAltaProbabilidade.map((c) => (
                  <ClienteLinha key={c.clienteId} cliente={c} isRisco={false} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previsoes.clientesRisco.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">
            Clientes em risco
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Etapa</th>
                  <th className="py-2 pr-3 font-medium">Corretor</th>
                  <th className="py-2 pr-3 font-medium text-right">VGV</th>
                  <th className="py-2 pr-3 font-medium text-right">Prob.</th>
                  <th className="py-2 font-medium text-right">Dias</th>
                </tr>
              </thead>
              <tbody>
                {previsoes.clientesRisco.map((c) => (
                  <ClienteLinha key={c.clienteId} cliente={c} isRisco={true} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}