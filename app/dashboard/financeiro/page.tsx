// ─── Módulo Financeiro Comercial (Sprint 11) ─────────────────────────────────
// Dashboard completo com 7 seções: Resumo, Comissões, Produção,
// Ranking, Empreendimentos, Previsão, Filtros.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { financeiroDadosIniciais } from './actions'
import { FinanceiroFiltros } from '@/src/types/financeiro'
import { formatarMoeda } from '@/src/lib/formatters'
import KpiCard from '@/src/components/ui/KpiCard'
import ComissaoAcoes from '@/src/components/financeiro/ComissaoAcoes'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    corretor?: string
    empreendimento?: string
    periodo?: string
    status?: string
  }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const params = await searchParams
  const filtros: FinanceiroFiltros = {
    corretorId: params.corretor ?? null,
    empreendimentoId: params.empreendimento ?? null,
    periodo: (params.periodo as FinanceiroFiltros['periodo']) ?? 'mes',
    dataInicio: null,
    dataFim: null,
    status: (params.status as FinanceiroFiltros['status']) ?? null,
  }

  const dados = await financeiroDadosIniciais(filtros)

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro Comercial</h1>
          <p className="mt-1 text-sm text-gray-500">Comissões, VGV e previsão de recebimento</p>
        </div>
      </div>

      {/* SEÇÃO 7: Filtros */}
      <FiltrosBarra {...{ filtros, corretores: dados.corretores, empreendimentos: dados.empreendimentosList }} />

      {/* SEÇÃO 1: Resumo */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Resumo Financeiro</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <KpiCard label="VGV do mês" value={formatarMoeda(dados.resumo.vgvMes)} color="sky" size="md" padding="normal" />
          <KpiCard label="Comissão prevista" value={formatarMoeda(dados.resumo.comissaoPrevista)} color="amber" size="md" padding="normal" />
          <KpiCard label="Comissão recebida" value={formatarMoeda(dados.resumo.comissaoRecebida)} color="emerald" size="md" padding="normal" />
          <KpiCard label="Comissão pendente" value={formatarMoeda(dados.resumo.comissaoPendente)} color="rose" size="md" padding="normal" />
          <KpiCard label="Ticket médio" value={formatarMoeda(dados.resumo.ticketMedio)} color="violet" size="md" padding="normal" />
          <KpiCard label="Vendas" value={dados.resumo.totalVendas.toString()} color="teal" size="md" padding="normal" />
        </div>
      </section>

      {/* SEÇÃO 2: Tabela de Comissões */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Comissões</h2>
        <p className="text-sm text-gray-500">{dados.comissoes.length} vendas com comissão</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Empreendimento</th>
                <th className="px-4 py-3">Corretor</th>
                <th className="px-4 py-3 text-right">VGV</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prevista</th>
                <th className="px-4 py-3">Recebimento</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.comissoes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma comissão encontrada no período.
                  </td>
                </tr>
              )}
              {dados.comissoes.map((item) => (
                <tr key={item.clienteId} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/clientes/${item.clienteId}`} className="font-medium text-blue-600 hover:underline">
                      {item.clienteNome}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{item.empreendimentoNome ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{item.corretorNome}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatarMoeda(item.vgv)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{item.percentual ? `${item.percentual}%` : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-800">{item.valor ? formatarMoeda(item.valor) : '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{item.dataPrevista ? new Date(item.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{item.dataRecebimento ? new Date(item.dataRecebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-2.5">
                    <ComissaoAcoes clienteId={item.clienteId} statusAtual={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEÇÃO 3: Produção Financeira (VGV + Comissões) - gráfico textual */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Produção Financeira</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* VGV ao longo do tempo */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-500">VGV Mensal</h3>
            <div className="mt-2 space-y-1.5">
              {dados.producao.slice(-12).map((p) => {
                const maxVgv = Math.max(...dados.producao.map((x) => x.vgv), 1)
                const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const [ano, mes] = p.periodo.split('-')
                const label = meses[Number(mes) - 1] ?? p.periodo
                return (
                  <div key={p.periodo} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-right text-gray-400">{label}</span>
                    <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded transition-all"
                        style={{ width: `${(p.vgv / maxVgv) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right tabular-nums text-gray-600">{formatarMoeda(p.vgv)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comissões ao longo do tempo */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-500">Comissões Mensais</h3>
            <div className="mt-2 space-y-1.5">
              {dados.producao.slice(-12).map((p) => {
                const maxCom = Math.max(...dados.producao.map((x) => x.comissoes), 1)
                const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const [ano, mes] = p.periodo.split('-')
                const label = meses[Number(mes) - 1] ?? p.periodo
                return (
                  <div key={p.periodo} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-right text-gray-400">{label}</span>
                    <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded transition-all"
                        style={{ width: `${(p.comissoes / maxCom) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right tabular-nums text-gray-600">{formatarMoeda(p.comissoes)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: Ranking Financeiro */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Ranking Financeiro</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Corretor</th>
                <th className="px-4 py-3 text-right">VGV</th>
                <th className="px-4 py-3 text-right">Comissões</th>
                <th className="px-4 py-3 text-right">Ticket Médio</th>
                <th className="px-4 py-3 text-right">Conversão</th>
                <th className="px-4 py-3 text-right">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {dados.ranking.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum corretor com vendas no período.
                  </td>
                </tr>
              )}
              {dados.ranking.map((item, idx) => (
                <tr key={item.corretorId} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{item.corretorNome}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-700">{formatarMoeda(item.vgv)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{formatarMoeda(item.comissoes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{formatarMoeda(item.ticketMedio)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className={item.conversao >= 50 ? 'text-emerald-600 font-semibold' : item.conversao >= 25 ? 'text-amber-600' : 'text-red-500'}>
                      {item.conversao}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{item.vendas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEÇÃO 5: Empreendimentos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Empreendimentos</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Empreendimento</th>
                <th className="px-4 py-3 text-right">VGV</th>
                <th className="px-4 py-3 text-right">Comissões</th>
                <th className="px-4 py-3 text-right">Clientes</th>
              </tr>
            </thead>
            <tbody>
              {dados.empreendimentos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhum dado por empreendimento.
                  </td>
                </tr>
              )}
              {dados.empreendimentos.map((item) => (
                <tr key={item.empreendimentoId ?? '__sem'} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{item.empreendimentoNome}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-700">{formatarMoeda(item.vgv)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{formatarMoeda(item.comissoes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{item.clientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEÇÃO 6: Previsão */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Previsão de Recebimento</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Próximos 7 dias</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{formatarMoeda(dados.previsao.proximos7Dias)}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Próximos 30 dias</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatarMoeda(dados.previsao.proximos30Dias)}</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Próximos 90 dias</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{formatarMoeda(dados.previsao.proximos90Dias)}</p>
          </div>
        </div>

        {dados.previsao.detalhes.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Valor Previsto</th>
                  <th className="px-4 py-3 text-right">Data Prevista</th>
                </tr>
              </thead>
              <tbody>
                {dados.previsao.detalhes.slice(0, 15).map((d) => (
                  <tr key={d.clienteId} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/clientes/${d.clienteId}`} className="font-medium text-blue-600 hover:underline">
                        {d.clienteNome}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatarMoeda(d.valor)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                      {new Date(d.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const mapa: Record<string, string> = {
    PREVISTA: 'bg-amber-100 text-amber-700',
    RECEBIDA: 'bg-emerald-100 text-emerald-700',
    CANCELADA: 'bg-red-100 text-red-700',
  }
  const label = status === 'PREVISTA' ? 'Prevista' : status === 'RECEBIDA' ? 'Recebida' : 'Cancelada'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${mapa[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label}
    </span>
  )
}

function FiltrosBarra({
  filtros,
  corretores,
  empreendimentos,
}: {
  filtros: FinanceiroFiltros
  corretores: { id: string; nome: string }[]
  empreendimentos: { id: string; nome: string }[]
}) {
  return (
    <form className="flex flex-wrap gap-3 items-end rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 mb-1">Período</label>
        <select name="periodo" defaultValue={filtros.periodo ?? 'mes'} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="mes">Mês atual</option>
          <option value="semana">Esta semana</option>
          <option value="ano">Este ano</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 mb-1">Corretor</label>
        <select name="corretor" defaultValue={filtros.corretorId ?? ''} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Todos</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 mb-1">Empreendimento</label>
        <select name="empreendimento" defaultValue={filtros.empreendimentoId ?? ''} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Todos</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 mb-1">Status</label>
        <select name="status" defaultValue={filtros.status ?? 'TODOS'} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="TODOS">Todos</option>
          <option value="PREVISTA">Prevista</option>
          <option value="RECEBIDA">Recebida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
      >
        Filtrar
      </button>
    </form>
  )
}