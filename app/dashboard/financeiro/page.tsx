// ─── Módulo Financeiro Comercial (Sprint 11) ─────────────────────────────────
// Dashboard completo com 7 seções: Resumo, Comissões, Produção,
// Ranking, Empreendimentos, Previsão, Filtros.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { financeiroDadosIniciais } from './actions'
import { FinanceiroFiltros } from '@/src/types/financeiro'
import { formatarMoeda } from '@/src/lib/formatters'
import KpiCard from '@/src/components/ui/KpiCard'
import Badge from '@/src/components/ui/Badge'
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
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Financeiro Comercial</h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Comissões, VGV e previsão de recebimento</p>
      </div>

      {/* SEÇÃO 7: Filtros */}
      <FiltrosBarra {...{ filtros, corretores: dados.corretores, empreendimentos: dados.empreendimentosList }} />

      {/* SEÇÃO 1: Resumo */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Resumo Financeiro</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
          <KpiCard label="VGV do mês" value={formatarMoeda(dados.resumo.vgvMes)} size="sm" padding="compact" />
          <KpiCard label="Comissão prevista" value={formatarMoeda(dados.resumo.comissaoPrevista)} size="sm" padding="compact" />
          <KpiCard label="Comissão recebida" value={formatarMoeda(dados.resumo.comissaoRecebida)} size="sm" padding="compact" />
          <KpiCard label="Comissão pendente" value={formatarMoeda(dados.resumo.comissaoPendente)} size="sm" padding="compact" />
          <KpiCard label="Ticket médio" value={formatarMoeda(dados.resumo.ticketMedio)} size="sm" padding="compact" />
          <KpiCard label="Vendas" value={dados.resumo.totalVendas.toString()} size="sm" padding="compact" />
        </div>
      </section>

      {/* SEÇÃO 2: Tabela de Comissões */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Comissões</h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">{dados.comissoes.length} vendas com comissão</p>
        <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-left text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Empreendimento</th>
                <th className="px-3 py-2.5 font-medium">Corretor</th>
                <th className="px-3 py-2.5 text-right font-medium">VGV</th>
                <th className="px-3 py-2.5 text-right font-medium">%</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Prevista</th>
                <th className="px-3 py-2.5 font-medium">Recebimento</th>
                <th className="px-3 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.comissoes.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                    Nenhuma comissão encontrada no período.
                  </td>
                </tr>
              )}
              {dados.comissoes.map((item) => (
                <tr key={item.clienteId} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-150">
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/clientes/${item.clienteId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-xs">
                      {item.clienteNome}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{item.empreendimentoNome ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{item.corretorNome}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700 dark:text-gray-300">{formatarMoeda(item.vgv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-500 dark:text-gray-400">{item.percentual ? `${item.percentual}%` : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs font-semibold text-gray-800 dark:text-gray-200">{item.valor ? formatarMoeda(item.valor) : '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-500">{item.dataPrevista ? new Date(item.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-500">{item.dataRecebimento ? new Date(item.dataRecebimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-3 py-2">
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Produção Financeira</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
            <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500">VGV Mensal</h3>
            <div className="mt-2 space-y-1">
              {dados.producao.slice(-12).map((p) => {
                const maxVgv = Math.max(...dados.producao.map((x) => x.vgv), 1)
                const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const [ano, mes] = p.periodo.split('-')
                const label = meses[Number(mes) - 1] ?? p.periodo
                return (
                  <div key={p.periodo} className="flex items-center gap-2 text-[11px]">
                    <span className="w-8 text-right text-gray-400 dark:text-gray-500">{label}</span>
                    <div className="flex-1 h-3 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500/60 rounded transition-all duration-300"
                        style={{ width: `${(p.vgv / maxVgv) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatarMoeda(p.vgv)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
            <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Comissões Mensais</h3>
            <div className="mt-2 space-y-1">
              {dados.producao.slice(-12).map((p) => {
                const maxCom = Math.max(...dados.producao.map((x) => x.comissoes), 1)
                const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const [ano, mes] = p.periodo.split('-')
                const label = meses[Number(mes) - 1] ?? p.periodo
                return (
                  <div key={p.periodo} className="flex items-center gap-2 text-[11px]">
                    <span className="w-8 text-right text-gray-400 dark:text-gray-500">{label}</span>
                    <div className="flex-1 h-3 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-400/60 rounded transition-all duration-300"
                        style={{ width: `${(p.comissoes / maxCom) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatarMoeda(p.comissoes)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: Ranking Financeiro */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Ranking Financeiro</h2>
        <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-left text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
                <th className="px-3 py-2.5 w-10">#</th>
                <th className="px-3 py-2.5">Corretor</th>
                <th className="px-3 py-2.5 text-right">VGV</th>
                <th className="px-3 py-2.5 text-right">Comissões</th>
                <th className="px-3 py-2.5 text-right">Ticket Médio</th>
                <th className="px-3 py-2.5 text-right">Conversão</th>
                <th className="px-3 py-2.5 text-right">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {dados.ranking.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                    Nenhum corretor com vendas no período.
                  </td>
                </tr>
              )}
              {dados.ranking.map((item, idx) => (
                <tr key={item.corretorId} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-150">
                  <td className="px-3 py-2 text-center text-xs font-bold text-gray-400 dark:text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200">{item.corretorNome}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-gray-700 dark:text-gray-300">{formatarMoeda(item.vgv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-emerald-600 dark:text-emerald-400">{formatarMoeda(item.comissoes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-500 dark:text-gray-400">{formatarMoeda(item.ticketMedio)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    <span className={item.conversao >= 50 ? 'text-emerald-600 font-medium' : item.conversao >= 25 ? 'text-amber-600' : 'text-red-500'}>
                      {item.conversao}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-600 dark:text-gray-400">{item.vendas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEÇÃO 5: Empreendimentos */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Empreendimentos</h2>
        <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-left text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
                <th className="px-3 py-2.5">Empreendimento</th>
                <th className="px-3 py-2.5 text-right">VGV</th>
                <th className="px-3 py-2.5 text-right">Comissões</th>
                <th className="px-3 py-2.5 text-right">Clientes</th>
              </tr>
            </thead>
            <tbody>
              {dados.empreendimentos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-xs text-gray-400 dark:text-gray-500">
                    Nenhum dado por empreendimento.
                  </td>
                </tr>
              )}
              {dados.empreendimentos.map((item) => (
                <tr key={item.empreendimentoId ?? '__sem'} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-150">
                  <td className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200">{item.empreendimentoNome}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs font-medium text-gray-700 dark:text-gray-300">{formatarMoeda(item.vgv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-emerald-600 dark:text-emerald-400">{formatarMoeda(item.comissoes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-500 dark:text-gray-400">{item.clientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEÇÃO 6: Previsão */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Previsão de Recebimento</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <KpiCard label="Próximos 7 dias" value={formatarMoeda(dados.previsao.proximos7Dias)} size="sm" padding="compact" />
          <KpiCard label="Próximos 30 dias" value={formatarMoeda(dados.previsao.proximos30Dias)} size="sm" padding="compact" />
          <KpiCard label="Próximos 90 dias" value={formatarMoeda(dados.previsao.proximos90Dias)} size="sm" padding="compact" />
        </div>

        {dados.previsao.detalhes.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-left text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5 text-right">Valor Previsto</th>
                  <th className="px-3 py-2.5 text-right">Data Prevista</th>
                </tr>
              </thead>
              <tbody>
                {dados.previsao.detalhes.slice(0, 15).map((d) => (
                  <tr key={d.clienteId} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-150">
                    <td className="px-3 py-2 text-xs">
                      <Link href={`/dashboard/clientes/${d.clienteId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {d.clienteNome}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700 dark:text-gray-300">{formatarMoeda(d.valor)}</td>
                    <td className="px-3 py-2 text-right text-[11px] text-gray-400 dark:text-gray-500">
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
  const variant = status === 'PREVISTA' ? 'warning' : status === 'RECEBIDA' ? 'success' : 'danger'
  const label = status === 'PREVISTA' ? 'Prevista' : status === 'RECEBIDA' ? 'Recebida' : 'Cancelada'
  return <Badge variant={variant}>{label}</Badge>
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
    <form className="flex flex-wrap gap-2 items-end rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3">
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500 mb-1">Período</label>
        <select name="periodo" defaultValue={filtros.periodo ?? 'mes'} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
          <option value="mes">Mês atual</option>
          <option value="semana">Esta semana</option>
          <option value="ano">Este ano</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500 mb-1">Corretor</label>
        <select name="corretor" defaultValue={filtros.corretorId ?? ''} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
          <option value="">Todos</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500 mb-1">Empreendimento</label>
        <select name="empreendimento" defaultValue={filtros.empreendimentoId ?? ''} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
          <option value="">Todos</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500 mb-1">Status</label>
        <select name="status" defaultValue={filtros.status ?? 'TODOS'} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300">
          <option value="TODOS">Todos</option>
          <option value="PREVISTA">Prevista</option>
          <option value="RECEBIDA">Recebida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-all duration-150"
      >
        Filtrar
      </button>
    </form>
  )
}