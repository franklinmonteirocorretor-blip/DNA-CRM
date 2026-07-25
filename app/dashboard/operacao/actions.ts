'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { hoje, inicioDoMes, ultimoDiaDoMes } from '@/src/lib/analytics'
import { queryResumoOperacao, queryKPIsDiarios, queryRanking, queryFunilGerencial, queryAlertas, queryMetas } from '@/src/lib/server/queries-compartilhadas'
import type {
  GestaoResumoOperacao,
  GestaoKPI,
  GestaoRankingItem,
  GestaoFunilEtapa,
  GestaoAlertas,
  GestaoMeta,
} from '@/src/types'

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
  const iniMes = inicioDoMes()
  const fimMes = ultimoDiaDoMes()

  // ─── Resumo, KPIs, Ranking, Funil, Alertas, Metas (compartilhados) ───
  const resumo = await queryResumoOperacao({ inicio: iniMes, fim: fimMes })

  const { data: corretores } = await supabase.from('usuarios').select('id').eq('status_usuario', 'ATIVO').is('deleted_at', null)
  const ids = (corretores ?? []).map((c) => c.id)

  const [kpis, ranking, funil, alertas] = await Promise.all([
    queryKPIsDiarios(ids, hojeStr),
    queryRanking(),
    queryFunilGerencial(),
    queryAlertas(),
  ])
  const metas = await queryMetas({ corretoresIds: ids, inicio: iniMes, fim: fimMes, vgvMes: resumo.vgvMes })

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

  // ─── Monitor da equipe ───
  const { data: prodHoje } = ids.length > 0 ? await supabase.from('producao_diaria').select('*').in('usuario_id', ids).eq('data', hojeStr) : { data: [] }
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