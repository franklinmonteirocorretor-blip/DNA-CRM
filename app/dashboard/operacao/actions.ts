'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoAlertas,
  GestaoMeta,
  EtapaFunil,
} from '@/src/types'

function hoje(): string { return new Date().toISOString().slice(0, 10) }
function inicioMes(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
function ultimoDiaMes(): string { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) }

export interface OperacaoDadosIniciais {
  resumo: GestaoResumoOperacao
  atividadesRecentes: {
    id: string
    created_at: string
    tipo: string
    resultado: string | null
    usuarioNome: string
    clienteNome: string
    clienteId: string
    etapaAtual: string | null
    empreendimentoInteresse: string | null
  }[]
  kpis: GestaoKPI[]
  ranking: GestaoRankingItem[]
  funil: GestaoFunilEtapa[]
  alertas: GestaoAlertas
  metas: GestaoMeta
  corretoresMonitor: {
    id: string
    nome: string
    avatarUrl: string | null
    statusUsuario: string
    ultimaAtividade: string | null
    minutosSemAtividade: number
    ligacoes: number
    whatsapps: number
    followUps: number
    agendamentos: number
    comparecimentos: number
    pastas: number
    percentualMeta: number
  }[]
}

export async function operacaoDadosIniciais(): Promise<OperacaoDadosIniciais> {
  const supabase = await createSupabaseServerClient()
  const hojeStr = hoje()
  const iniMes = inicioMes()
  const fimMes = ultimoDiaMes()

  // ─── Resumo (reutiliza queries da Sprint 3) ───
  const [
    { count: leadsAtivos },
    { count: clientesAtendimento },
    { count: agendamentosHoje },
    { count: comparecimentosHoje },
    { data: vendasMes },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('etapa_atual', 'NOVO_LEAD').is('deleted_at', null),
    supabase.from('clientes').select('*', { count: 'exact', head: true })
      .in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS', 'POS_VENDA'])
      .is('deleted_at', null),
    supabase.from('agendamentos').select('*', { count: 'exact', head: true }).gte('data_hora', `${hojeStr}T00:00:00`).lte('data_hora', `${hojeStr}T23:59:59`),
    supabase.from('comparecimentos').select('*', { count: 'exact', head: true }).eq('resultado', 'COMPARECEU').gte('created_at', `${hojeStr}T00:00:00`).lte('created_at', `${hojeStr}T23:59:59`),
    supabase.from('clientes').select('vgv, comissao_valor').eq('ficha_proposta_assinada', true).gte('data_fechamento', `${iniMes}T00:00:00`).lte('data_fechamento', `${fimMes}T23:59:59`).is('deleted_at', null),
  ])

  const vendasArr = vendasMes ?? []
  const vgvMes = vendasArr.reduce((s, v) => s + (v.vgv ?? 0), 0)
  const comissaoPrevista = vendasArr.reduce((s, v) => s + (v.comissao_valor ?? 0), 0)

  const { data: prodMes } = await supabase.from('producao_diaria').select('aprovacoes, vendas').gte('data', iniMes).lte('data', fimMes)
  const aprovacoes = (prodMes ?? []).reduce((s, p) => s + p.aprovacoes, 0)
  const vendasCount = (prodMes ?? []).reduce((s, p) => s + p.vendas, 0)

  const resumo: GestaoResumoOperacao = {
    leadsAtivos: leadsAtivos ?? 0,
    clientesAtendimento: clientesAtendimento ?? 0,
    agendamentosHoje: agendamentosHoje ?? 0,
    comparecimentosHoje: comparecimentosHoje ?? 0,
    aprovacoesMes: aprovacoes,
    vendasMes: vendasCount,
    vgvMes,
    comissaoPrevista,
  }

  // ─── Atividades recentes (últimas 50 para timeline) ───
  const { data: atividades } = await supabase
    .from('atividades')
    .select('id, created_at, tipo, resultado, usuarios!inner(nome), clientes!inner(nome, id, etapa_atual, empreendimento_interesse)')
    .order('created_at', { ascending: false })
    .limit(50)

  const atividadesRecentes = (atividades ?? []).map((a) => ({
    id: a.id,
    created_at: a.created_at,
    tipo: a.tipo,
    resultado: a.resultado,
    usuarioNome: (a.usuarios as unknown as { nome: string })?.nome ?? '',
    clienteNome: (a.clientes as unknown as { nome: string })?.nome ?? '',
    clienteId: (a.clientes as unknown as { id: string })?.id ?? '',
    etapaAtual: (a.clientes as unknown as { etapa_atual: string })?.etapa_atual ?? null,
    empreendimentoInteresse: (a.clientes as unknown as { empreendimento_interesse: string })?.empreendimento_interesse ?? null,
  }))

  // ─── KPIs do dia ───
  const { data: corretores } = await supabase.from('usuarios').select('id').eq('status_usuario', 'ATIVO').is('deleted_at', null)
  const ids = (corretores ?? []).map((c) => c.id)
  const { data: prodHoje } = ids.length > 0 ? await supabase.from('producao_diaria').select('*').in('usuario_id', ids).eq('data', hojeStr) : { data: [] }
  const { data: usuarios } = await supabase.from('usuarios').select('id, nome, avatar_url').in('id', ids)

  const mapa = (usuarios ?? []).reduce((acc, u) => { acc[u.id] = u; return acc }, {} as Record<string, { nome: string; avatar_url: string | null }>)
  const METAS_D = { ligacoes: 80, whatsapps: 40, followUps: 20, agendamentos: 2, comparecimentos: 2, pastas: 1 }

  const kpis: GestaoKPI[] = ids.map((uid) => {
    const p = (prodHoje ?? []).find((x) => x.usuario_id === uid)
    const lig = p?.ligacoes ?? 0; const wha = p?.whatsapp ?? 0; const fol = p?.follow_ups ?? 0
    const age = p?.agendamentos ?? 0; const com = p?.comparecimentos ?? 0; const pas = p?.pastas ?? 0
    const pcts = [
      Math.min(100, (lig / METAS_D.ligacoes) * 100), Math.min(100, (wha / METAS_D.whatsapps) * 100),
      Math.min(100, (fol / METAS_D.followUps) * 100), Math.min(100, (age / METAS_D.agendamentos) * 100),
      Math.min(100, (com / METAS_D.comparecimentos) * 100), Math.min(100, (pas / METAS_D.pastas) * 100),
    ]
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    const batida = lig >= METAS_D.ligacoes && wha >= METAS_D.whatsapps && fol >= METAS_D.followUps && age >= METAS_D.agendamentos && com >= METAS_D.comparecimentos && pas >= METAS_D.pastas
    const u = mapa[uid]
    return { usuarioId: uid, nome: u?.nome ?? 'Desconhecido', avatarUrl: u?.avatar_url ?? null, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: com, pastas: pas, percentualDiario: pct, status: batida ? 'META_BATIDA' : 'META_PENDENTE' }
  })

  // ─── Ranking ───
  const { data: rankingRaw } = await supabase.rpc('fn_ranking_mes')
  const ranking = (rankingRaw ?? []).map((r: Record<string, unknown>, i: number) => ({
    posicao: i + 1,
    usuarioId: r.usuario_id as string,
    nome: r.nome as string,
    avatarUrl: null as string | null,
    pontuacao: Number(r.pontos),
    vendas: Number(r.vendas),
    aprovacoes: (r.producao as Record<string, number>)?.aprovacoes ?? 0,
  }))

  // ─── Funil ───
  const ETAPA_ORDEM: EtapaFunil[] = ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS', 'POS_VENDA']
  const ETAPA_LABELS: Record<EtapaFunil, string> = { NOVO_LEAD: 'Novo Contato', CONTATOS: 'Contato Realizado', AGENDAMENTO: 'Visita Agendada', COMPARECIMENTO: 'Visita', ANALISE: 'Análise', RESTRICOES: 'Restrições', CONDICIONADOS: 'Condicionado', APROVADOS: 'Aprovado', FECHAMENTOS: 'Documentação/Contrato', POS_VENDA: 'Pós-venda' }
  const { data: clientesFunil } = await supabase.from('clientes').select('etapa_atual').is('deleted_at', null)
  const contagem: Record<string, number> = {}
  for (const c of clientesFunil ?? []) contagem[c.etapa_atual] = (contagem[c.etapa_atual] ?? 0) + 1
  const totalF = Object.values(contagem).reduce((a, b) => a + b, 0)
  const funil = ETAPA_ORDEM.map((etapa, idx) => {
    const q = contagem[etapa] ?? 0
    const ant = idx > 0 ? (contagem[ETAPA_ORDEM[idx - 1]] ?? 0) : null
    return { etapa, label: ETAPA_LABELS[etapa], quantidade: q, percentual: totalF > 0 ? Math.round((q / totalF) * 100) : 0, taxaConversao: ant !== null && ant > 0 ? Math.round((q / ant) * 100) : null }
  })

  // ─── Alertas (reutiliza queries da Sprint 3) ───
  const tresDias = new Date(Date.now() - 3 * 86400000).toISOString()
  const seteDias = new Date(Date.now() - 7 * 86400000).toISOString()
  const [sC, perd, docs, parF, agRet] = await Promise.all([
    supabase.from('clientes').select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)').in('etapa_atual', ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS']).lt('ultima_atividade_em', tresDias).is('deleted_at', null).order('ultima_atividade_em').limit(20).then(r => r.data ?? []),
    supabase.from('agendamentos').select('id, data_hora, status, clientes(nome), usuarios!inner(nome)').eq('status', 'CANCELADO').gte('updated_at', seteDias).order('updated_at', { ascending: false }).limit(20).then(r => r.data ?? []),
    supabase.from('documentos').select('cliente_id, clientes!inner(nome, etapa_atual)').eq('status_validacao', 'PENDENTE').is('deleted_at', null).limit(50).then(r => r.data ?? []),
    supabase.from('clientes').select('id, nome, etapa_atual, ultima_atividade_em, corretor_responsavel_id, usuarios!inner(nome)').in('etapa_atual', ['CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS', 'FECHAMENTOS']).lt('ultima_atividade_em', seteDias).is('deleted_at', null).order('ultima_atividade_em').limit(20).then(r => r.data ?? []),
    supabase.from('clientes').select('id, nome, proxima_acao, proxima_acao_em, corretor_responsavel_id, usuarios!inner(nome)').not('proxima_acao_em', 'is', null).lte('proxima_acao_em', new Date(Date.now() + 2 * 86400000).toISOString()).gte('proxima_acao_em', seteDias).is('deleted_at', null).order('proxima_acao_em').limit(20).then(r => r.data ?? []),
  ])
  const docsPorCli: Record<string, { nome: string; etapa: EtapaFunil; qtd: number }> = {}
  for (const d of docs) { const c = d.clientes as unknown as { nome: string; etapa_atual: EtapaFunil } | null; if (c) { if (!docsPorCli[d.cliente_id]) docsPorCli[d.cliente_id] = { nome: c.nome, etapa: c.etapa_atual, qtd: 0 }; docsPorCli[d.cliente_id].qtd++ } }
  const alertas: GestaoAlertas = {
    clientesSemContato3dias: sC.map((c: Record<string, unknown>) => ({ clienteId: c.id as string, nome: c.nome as string, etapa: c.etapa_atual as EtapaFunil, diasSemContato: Math.floor((Date.now() - new Date(c.ultima_atividade_em as string).getTime()) / 86400000), corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '' })),
    agendamentosPerdidos: perd.map((a: Record<string, unknown>) => ({ agendamentoId: a.id as string, clienteNome: ((a.clientes as unknown as { nome: string })?.nome) ?? '', dataHora: a.data_hora as string, status: a.status as 'CANCELADO', corretorNome: ((a.usuarios as unknown as { nome: string })?.nome) ?? '' })),
    pendenciasDocumentais: Object.entries(docsPorCli).map(([clienteId, d]) => ({ clienteId, clienteNome: d.nome, qtdDocumentosPendentes: d.qtd, etapa: d.etapa })),
    clientesParadosFunil: parF.map((c: Record<string, unknown>) => ({ clienteId: c.id as string, nome: c.nome as string, etapa: c.etapa_atual as EtapaFunil, diasNaEtapa: Math.floor((Date.now() - new Date(c.ultima_atividade_em as string).getTime()) / 86400000), corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '' })),
    aguardandoRetorno: agRet.map((c: Record<string, unknown>) => ({ clienteId: c.id as string, nome: c.nome as string, proximaAcao: (c.proxima_acao as string) ?? '', proximaAcaoEm: (c.proxima_acao_em as string) ?? '', corretorNome: ((c.usuarios as unknown as { nome: string })?.nome) ?? '' })),
  }

  // ─── Metas ───
  const { data: prodTodos } = await supabase.from('producao_diaria').select('*').in('usuario_id', ids).gte('data', iniMes).lte('data', fimMes)
  const soma = (rows: typeof prodTodos) => (rows ?? []).reduce((acc, p) => { acc.vendas += p.vendas; acc.aprovacoes += p.aprovacoes; acc.agendamentos += p.agendamentos; acc.comparecimentos += p.comparecimentos; acc.pastas += p.pastas; return acc }, { vendas: 0, aprovacoes: 0, agendamentos: 0, comparecimentos: 0, pastas: 0 })
  const realEq = soma(prodTodos)
  const metaBase = { vendas: 4 * ids.length, aprovacoes: 8 * ids.length, agendamentos: 40 * ids.length, comparecimentos: 30 * ids.length, pastas: 20 * ids.length }
  const metaIndBase = { vendas: 4, aprovacoes: 8, agendamentos: 40, comparecimentos: 30, pastas: 20 }
  const calcPct = (r: typeof realEq, m: typeof metaBase) => { const pcts = [m.vendas > 0 ? Math.min(100, (r.vendas / m.vendas) * 100) : 0, m.aprovacoes > 0 ? Math.min(100, (r.aprovacoes / m.aprovacoes) * 100) : 0, m.agendamentos > 0 ? Math.min(100, (r.agendamentos / m.agendamentos) * 100) : 0, m.comparecimentos > 0 ? Math.min(100, (r.comparecimentos / m.comparecimentos) * 100) : 0, m.pastas > 0 ? Math.min(100, (r.pastas / m.pastas) * 100) : 0]; return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) }
  const diasRest = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())
  const metas: GestaoMeta = {
    metaEquipe: metaBase, metaIndividual: metaIndBase, realizadoEquipe: realEq, realizadoIndividual: realEq,
    percentualEquipe: calcPct(realEq, metaBase), percentualIndividual: calcPct(realEq, metaIndBase),
    diasRestantes: diasRest, projecaoFechamento: { vendas: Math.round(realEq.vendas * 1.2), vgv: vgvMes * 1.2 },
  }

  // ─── Monitor da equipe ───
  const { data: corretoresFull } = await supabase.from('usuarios').select('id, nome, avatar_url, status_usuario, ultima_atividade_em').eq('status_usuario', 'ATIVO').is('deleted_at', null)
  const agora = Date.now()
  const corretoresMonitor = (corretoresFull ?? []).map((c) => {
    const p = (prodHoje ?? []).find((x) => x.usuario_id === c.id)
    const lig = p?.ligacoes ?? 0; const wha = p?.whatsapp ?? 0; const fol = p?.follow_ups ?? 0
    const age = p?.agendamentos ?? 0; const comp = p?.comparecimentos ?? 0; const pas = p?.pastas ?? 0
    const pcts = [Math.min(100, (lig / 80) * 100), Math.min(100, (wha / 40) * 100), Math.min(100, (fol / 20) * 100), Math.min(100, (age / 2) * 100), Math.min(100, (comp / 2) * 100), Math.min(100, (pas / 1) * 100)]
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    const minSemAtividade = c.ultima_atividade_em ? Math.floor((agora - new Date(c.ultima_atividade_em as string).getTime()) / 60000) : 999
    return { id: c.id, nome: c.nome, avatarUrl: c.avatar_url, statusUsuario: c.status_usuario, ultimaAtividade: c.ultima_atividade_em as string | null, minutosSemAtividade: minSemAtividade, ligacoes: lig, whatsapps: wha, followUps: fol, agendamentos: age, comparecimentos: comp, pastas: pas, percentualMeta: pct }
  })

  return { resumo, atividadesRecentes, kpis, ranking, funil, alertas, metas, corretoresMonitor }
}