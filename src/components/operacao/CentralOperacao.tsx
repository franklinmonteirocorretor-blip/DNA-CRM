'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/src/lib/supabase'
import { useAuth } from '@/src/hooks/useAuth'
import { operacaoDadosIniciais, type OperacaoDadosIniciais, type FilaTrabalhoItem, queryFilaTrabalho } from '@/app/dashboard/operacao/actions'
import {
  type GestaoResumoOperacao,
  type GestaoKPI,
  type GestaoRankingItem,
} from '@/src/types'
import Link from 'next/link'
import HeatmapProducao from './HeatmapProducao'
import ProdutividadeChart from './ProdutividadeChart'
import FilaTrabalho from './FilaTrabalho'
import BuscaGlobal from './BuscaGlobal'
import KpiOperacaoCard from './KpiOperacaoCard'
import CentroComando from './CentroComando'
import { formatarMoeda } from '@/src/lib/formatters'

// ─── Tipos locais para Realtime ───
interface AtividadeRealtime {
  id: string; created_at: string; tipo: string; resultado: string | null
  usuarioNome: string; clienteNome: string; clienteId: string
  etapaAtual: string | null; empreendimentoInteresse: string | null
}

// ─── Helpers ───
function formatarMoedain(m: number): string { return m < 60 ? `${m}min` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d` }

// ─── Central de Operações ───
export default function CentralOperacao({ dadosIniciais }: { dadosIniciais: OperacaoDadosIniciais }) {
  const [dados, setDados] = useState<OperacaoDadosIniciais>(dadosIniciais)
  const [atividades, setAtividades] = useState<AtividadeRealtime[]>(dadosIniciais.atividadesRecentes)
  const [kpis, setKpis] = useState<GestaoKPI[]>(dadosIniciais.kpis)
  const [ranking, setRanking] = useState<GestaoRankingItem[]>(dadosIniciais.ranking)
  const [resumo, setResumo] = useState<GestaoResumoOperacao>(dadosIniciais.resumo)
  const [corretores, setCorretores] = useState(dadosIniciais.corretoresMonitor)
  const [pulso, setPulso] = useState(0) // força re-render periódico para "tempo desde última atividade"
  const [filaTrabalho, setFilaTrabalho] = useState<FilaTrabalhoItem[]>([])
  const { user } = useAuth()

  // ─── Realtime: atividades (INSERT) ───
  useEffect(() => {
    const canal = supabase
      .channel('operacao-atividades')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'atividades' },
        async (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const nova = payload.new as Record<string, unknown>
          // Busca nomes do usuario e cliente
          const [{ data: usr }, { data: cli }] = await Promise.all([
            supabase.from('usuarios').select('nome').eq('id', nova.usuario_id).single(),
            supabase.from('clientes').select('nome, etapa_atual, empreendimento_interesse').eq('id', nova.cliente_id).single(),
          ])
          const atividade: AtividadeRealtime = {
            id: nova.id as string,
            created_at: nova.created_at as string,
            tipo: nova.tipo as string,
            resultado: nova.resultado as string | null,
            usuarioNome: (usr as { nome: string } | null)?.nome ?? '',
            clienteNome: (cli as { nome: string } | null)?.nome ?? '',
            clienteId: nova.cliente_id as string,
            etapaAtual: (cli as { etapa_atual: string } | null)?.etapa_atual ?? null,
            empreendimentoInteresse: (cli as { empreendimento_interesse: string } | null)?.empreendimento_interesse ?? null,
          }
          setAtividades((prev) => [atividade, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  // ─── Realtime: producao_diaria (UPDATE) — atualiza KPIs ───
  useEffect(() => {
    const canal = supabase
      .channel('operacao-producao')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'producao_diaria' },
        (payload) => {
          const p = payload.new as Record<string, unknown>
          const uid = p.usuario_id as string
          // Atualiza KPI do corretor afetado
          setKpis((prev) => prev.map((k) => {
            if (k.usuarioId !== uid) return k
            const lig = Number(p.ligacoes ?? 0); const wha = Number(p.whatsapp ?? 0); const fol = Number(p.follow_ups ?? 0)
            const age = Number(p.agendamentos ?? 0); const com = Number(p.comparecimentos ?? 0); const pas = Number(p.pastas ?? 0)
            const pcts = [
              Math.min(100, (lig / 80) * 100), Math.min(100, (wha / 40) * 100), Math.min(100, (fol / 20) * 100),
              Math.min(100, (age / 2) * 100), Math.min(100, (com / 2) * 100), Math.min(100, (pas / 1) * 100),
            ]
            const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
            const batida = lig >= 80 && wha >= 40 && fol >= 20 && age >= 2 && com >= 2 && pas >= 1
            return { ...k, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: com, pastas: pas, percentualDiario: pct, status: batida ? 'META_BATIDA' : 'META_PENDENTE' }
          }))
          // Atualiza também corretoresMonitor
          setCorretores((prev) => prev.map((c) => {
            if (c.id !== uid) return c
            const lig = Number(p.ligacoes ?? 0); const wha = Number(p.whatsapp ?? 0); const fol = Number(p.follow_ups ?? 0)
            const age = Number(p.agendamentos ?? 0); const com = Number(p.comparecimentos ?? 0); const pas = Number(p.pastas ?? 0)
            const pcts = [Math.min(100, (lig / 80) * 100), Math.min(100, (wha / 40) * 100), Math.min(100, (fol / 20) * 100), Math.min(100, (age / 2) * 100), Math.min(100, (com / 2) * 100), Math.min(100, (pas / 1) * 100)]
            return { ...c, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: com, pastas: pas, percentualMeta: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) }
          }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [])

  // ─── Pulso: atualiza indicadores de "tempo desde última atividade" a cada 30s ───
  useEffect(() => {
    const timer = setInterval(() => setPulso((p) => p + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // ─── Fila de trabalho: carrega client-side quando user está disponível ───
  useEffect(() => {
    if (!user?.id) return
    queryFilaTrabalho(user.id).then(setFilaTrabalho)
  }, [user?.id])

  // ─── Full refresh manual (fallback) ───
  const recarregar = useCallback(async () => {
    const fresh = await operacaoDadosIniciais()
    setDados(fresh); setAtividades(fresh.atividadesRecentes); setKpis(fresh.kpis)
    setRanking(fresh.ranking); setResumo(fresh.resumo); setCorretores(fresh.corretoresMonitor)
  }, [])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Operações</h1>
          <p className="mt-1 text-sm text-gray-500">Atualização em tempo real via Supabase Realtime.</p>
        </div>
        <div className="flex items-center gap-2">
          <BuscaGlobal />
          <button onClick={recarregar} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* ════ Seção 1: KPIs em Tempo Real (12 cards) ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">KPIs em Tempo Real</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <KpiOperacaoCard label="Leads Hoje" value={resumo.leadsHoje} color="sky" />
          <KpiOperacaoCard label="Ligações" value={resumo.ligacoesHoje} color="blue" />
          <KpiOperacaoCard label="WhatsApp" value={resumo.whatsAppsHoje} color="green" />
          <KpiOperacaoCard label="Follow-ups" value={resumo.followUpsHoje} color="orange" />
          <KpiOperacaoCard label="Agend. Hoje" value={resumo.agendamentosHoje} color="amber" />
          <KpiOperacaoCard label="Comparecimentos" value={resumo.comparecimentosHoje} color="emerald" />
          <KpiOperacaoCard label="Aprovações Mês" value={resumo.aprovacoesMes} color="indigo" />
          <KpiOperacaoCard label="Vendas Mês" value={resumo.vendasMes} color="teal" />
          <KpiOperacaoCard label="VGV Mês" value={resumo.vgvMes} color="cyan" monetario />
          <KpiOperacaoCard label="Comissão Prev." value={resumo.comissaoPrevista} color="rose" monetario />
          <KpiOperacaoCard label="Comissão Rec." value={resumo.comissaoRecebida} color="green" monetario />
          <KpiOperacaoCard label="Leads Ativos" value={resumo.leadsAtivos} color="violet" />
        </div>
      </section>

      {/* ════ Seção Intermediária: Fila de Trabalho ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Fila de Trabalho — Suas Próximas Ações</h2>
        <p className="text-xs text-gray-400 mb-2">Priorizado por urgência: clientes sem contato e prazos vencidos primeiro.</p>
        <FilaTrabalho acoes={filaTrabalho} />
      </section>

      {/* ════ Seção 3: Centro de Comando ════ */}
      <CentroComando />

      {/* ════ Seção 4: Atividade ao Vivo ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Atividade ao Vivo</h2>
        <p className="text-xs text-gray-400 mb-2">
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1" />
          Atualização automática — novas atividades aparecem em tempo real
        </p>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {atividades.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">Nenhuma atividade recente.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {atividades.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-xs">
                    <span className="w-12 shrink-0 tabular-nums text-gray-400">
                      {new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-20 shrink-0 font-medium text-gray-700 truncate">{a.usuarioNome.split(' ')[0]}</span>
                    <span className="flex-1 text-gray-500">
                      {a.tipo === 'LIGACAO' ? '📞 Ligou para' : a.tipo === 'WHATSAPP' ? '💬 WhatsApp para' : '🔄 Follow-up com'}{' '}
                      <Link href={`/dashboard/clientes/${a.clienteId}`} className="font-medium text-blue-600 hover:underline">{a.clienteNome}</Link>
                      {a.resultado && <span className="text-gray-400"> — {a.resultado}</span>}
                    </span>
                    {a.etapaAtual && (
                      <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 shrink-0">{a.etapaAtual}</span>
                    )}
                    {a.empreendimentoInteresse && (
                      <span className="text-[9px] text-gray-400 shrink-0 max-w-[80px] truncate hidden sm:inline">{a.empreendimentoInteresse}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════ Seção 3: Monitor da Equipe ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Monitor da Equipe</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {corretores.map((c) => {
            return (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{c.nome.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.nome}</p>
                    <p className="text-[10px] text-gray-400">
                      {c.minutosSemAtividade < 15 ? '🟢 Produzindo' : c.minutosSemAtividade < 60 ? '🟡 Baixa atividade' : '🔴 Sem atividade'} · {formatarMoedain(c.minutosSemAtividade)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                  <span className="text-gray-400">📞 {c.ligacoes}</span>
                  <span className="text-gray-400">💬 {c.whatsapps}</span>
                  <span className="text-gray-400">🔄 {c.followUps}</span>
                  <span className="text-gray-400">📅 {c.agendamentos}</span>
                  <span className="text-gray-400">🏠 {c.comparecimentos}</span>
                  <span className="text-gray-400">📁 {c.pastas}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.percentualMeta >= 100 ? 'bg-emerald-500' : c.percentualMeta >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.percentualMeta}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{c.percentualMeta}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ════ Seção 4: Clientes Prioritários ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Clientes Prioritários</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <AlertaPainel titulo="Sem contato +3d" icone="📞" cor="red" itens={dados.alertas.clientesSemContato3dias.map(c => ({ id: c.clienteId, nome: c.nome, subtitulo: `${c.diasSemContato}d sem contato · ${c.corretorNome}` }))} vazio="Todos contatados." />
          <AlertaPainel titulo="Doc. pendentes" icone="📄" cor="amber" itens={dados.alertas.pendenciasDocumentais.map(c => ({ id: c.clienteId, nome: c.clienteNome, subtitulo: `${c.qtdDocumentosPendentes} docs · ${c.etapa}` }))} vazio="Nenhum pendente." />
          <AlertaPainel titulo="Aguardando retorno" icone="⏳" cor="purple" itens={dados.alertas.aguardandoRetorno.map(c => ({ id: c.clienteId, nome: c.nome, subtitulo: `${c.proximaAcao} · ${c.corretorNome}` }))} vazio="Nenhum aguardando." />
          <AlertaPainel titulo="Parados no funil +7d" icone="⏸️" cor="orange" itens={dados.alertas.clientesParadosFunil.map(c => ({ id: c.clienteId, nome: c.nome, subtitulo: `${c.diasNaEtapa}d · ${c.etapa} · ${c.corretorNome}` }))} vazio="Nenhum parado." />
        </div>
      </section>

      {/* ════ Seção 5: Metas ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Metas da Empresa</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          {(['vendas', 'aprovacoes', 'agendamentos', 'comparecimentos', 'pastas'] as const).map((k) => {
            const meta = dados.metas.metaEquipe[k]; const real = dados.metas.realizadoEquipe[k]
            const pct = meta > 0 ? Math.min(100, Math.round((real / meta) * 100)) : 0
            return (
              <div key={k} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                <p className="text-gray-400 capitalize">{k}</p>
                <p className="text-lg font-bold text-gray-700">{real}<span className="text-xs text-gray-400">/{meta}</span></p>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} /></div>
                <p className="mt-0.5 text-[10px] text-gray-400">{pct}%</p>
              </div>
            )
          })}
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className="text-gray-400">VGV</p>
            <p className="text-lg font-bold text-gray-700">{formatarMoeda(resumo.vgvMes)}</p>
            <p className="text-[10px] text-gray-400">{dados.metas.diasRestantes}d restantes</p>
          </div>
        </div>
      </section>

      {/* ════ Seção 6: Ranking ao Vivo ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Ranking ao Vivo — Top 10</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-2 w-8">#</th><th className="pb-2">Corretor</th><th className="pb-2 text-right">Pontos</th><th className="pb-2 text-right">Vendas</th><th className="pb-2 text-right">Aprovações</th>
              </tr>
            </thead>
            <tbody>
              {ranking.slice(0, 10).map((r) => (
                <tr key={r.usuarioId} className="border-b border-gray-100">
                  <td className="py-2 font-bold text-gray-700">{r.posicao === 1 ? '🥇' : r.posicao === 2 ? '🥈' : r.posicao === 3 ? '🥉' : `${r.posicao}º`}</td>
                  <td className="py-2 text-gray-900">{r.nome}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-blue-600">{r.pontuacao.toLocaleString('pt-BR')}</td>
                  <td className="py-2 text-right tabular-nums text-teal-600">{r.vendas}</td>
                  <td className="py-2 text-right tabular-nums text-indigo-600">{r.aprovacoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════ Seção 7: Mapa do Pipeline ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Mapa do Pipeline</h2>
        <div className="mt-3 space-y-1.5">
          {dados.funil.map((e) => (
            <div key={e.etapa} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 text-gray-500">{e.label}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-blue-400 rounded" style={{ width: `${Math.max(1, e.percentual)}%` }} />
              </div>
              <span className="w-10 text-right font-semibold text-gray-700">{e.quantidade}</span>
              {e.taxaConversao !== null && <span className="w-14 text-right text-[10px] text-gray-400">{e.taxaConversao}% conv.</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ════ Seção 8: Alertas (Painel Vermelho) ════ */}

      {/* ════ Seção 8A: Heatmap de Produção ════ */}
      {dados.heatmap.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Heatmap de Produção (7 dias)</h2>
          <p className="text-xs text-gray-400 mb-2">Intensidade de atividade por corretor × hora do dia.</p>
          <HeatmapProducao dados={dados.heatmap} />
        </section>
      )}

      {/* ════ Seção 8B: Produtividade por Equipe ════ */}
      {dados.produtividadeEquipe.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Produtividade por Equipe (30 dias)</h2>
          <p className="text-xs text-gray-400 mb-2">Tendência de atividades por equipe ao longo do mês.</p>
          <ProdutividadeChart series={dados.produtividadeEquipe} />
        </section>
      )}

      {/* ════ Seção 8: Alertas (Painel Vermelho) ════ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">⚠️ Alertas</h2>
        <div className="mt-3 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-red-800 mb-1">Clientes esquecidos</p>
              {dados.alertas.clientesSemContato3dias.length === 0 ? <p className="text-red-400">Nenhum.</p> :
                dados.alertas.clientesSemContato3dias.slice(0, 5).map(c => (
                  <p key={c.clienteId} className="text-red-600"><Link href={`/dashboard/clientes/${c.clienteId}`} className="hover:underline">{c.nome}</Link> — {c.diasSemContato}d</p>
                ))
              }
            </div>
            <div>
              <p className="font-semibold text-red-800 mb-1">Agendamentos atrasados/cancelados</p>
              {dados.alertas.agendamentosPerdidos.length === 0 ? <p className="text-red-400">Nenhum.</p> :
                dados.alertas.agendamentosPerdidos.slice(0, 5).map(a => (
                  <p key={a.agendamentoId} className="text-red-600">{a.clienteNome} — {new Date(a.dataHora).toLocaleDateString('pt-BR')}</p>
                ))
              }
            </div>
            <div>
              <p className="font-semibold text-red-800 mb-1">Sem próxima ação</p>
              {kpis.filter(k => k.status === 'META_PENDENTE' && k.percentualDiario < 30).length === 0 ? <p className="text-red-400">Todos ativos.</p> :
                kpis.filter(k => k.status === 'META_PENDENTE' && k.percentualDiario < 30).slice(0, 5).map(k => (
                  <p key={k.usuarioId} className="text-red-600">{k.nome} — {k.percentualDiario}% da meta</p>
                ))
              }
            </div>
            <div>
              <p className="font-semibold text-red-800 mb-1">Corretores sem produção</p>
              {corretores.filter(c => c.percentualMeta === 0).length === 0 ? <p className="text-red-400">Todos produziram hoje.</p> :
                corretores.filter(c => c.percentualMeta === 0).slice(0, 5).map(c => (
                  <p key={c.id} className="text-red-600">{c.nome} — sem atividade hoje</p>
                ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé: status da conexão */}
      <p className="text-center text-[10px] text-gray-300">
        Supabase Realtime ativo · Última atualização: {new Date().toLocaleTimeString('pt-BR')} · Pulso #{pulso}
      </p>
    </div>
  )
}

// ─── Subcomponentes inline ───

function AlertaPainel({ titulo, icone, cor, itens, vazio }: { titulo: string; icone: string; cor: string; itens: { id: string; nome: string; subtitulo: string }[]; vazio: string }) {
  const pals: Record<string, string> = { red: 'border-red-200 bg-red-50', amber: 'border-amber-200 bg-amber-50', purple: 'border-purple-200 bg-purple-50', orange: 'border-orange-200 bg-orange-50' }
  const bgs: Record<string, string> = { red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700' }
  return (
    <div className={`rounded-lg border p-3 ${pals[cor] ?? ''}`}>
      <div className="flex items-center justify-between mb-1.5"><h3 className="text-xs font-semibold text-gray-800"><span className="mr-1">{icone}</span>{titulo}</h3>{itens.length > 0 && <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${bgs[cor] ?? ''}`}>{itens.length}</span>}</div>
      {itens.length === 0 ? <p className="text-[10px] text-gray-400">{vazio}</p> : itens.slice(0, 8).map(i => (
        <p key={i.id} className="text-[10px]"><Link href={`/dashboard/clientes/${i.id}`} className="text-gray-700 hover:text-blue-600">{i.nome}</Link><span className="ml-1.5 text-gray-400">{i.subtitulo}</span></p>
      ))}
    </div>
  )
}