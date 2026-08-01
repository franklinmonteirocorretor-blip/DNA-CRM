'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DadosRelatorio {
  titulo: string
  periodo: string
  geradoEm: string
  linhas: Record<string, string | number>[]
  colunas: string[]
  resumo: { label: string; valor: string | number }[]
}

// ── Busca dados para o relatório ─────────────────────────────────────────────

export async function gerarDadosRelatorio(
  tipo: string,
  dataInicio: string,
  dataFim: string
): Promise<DadosRelatorio> {
  const supabase = await createSupabaseServerClient()

  const usuario = await requireAuth()

  const ehCorretor = usuario.perfil === 'CORRETOR'
  const ehGerente = usuario.perfil === 'GERENTE'

  const idsFiltro: string[] = []
  if (ehCorretor) {
    idsFiltro.push(usuario.id)
  } else if (ehGerente) {
    const { data: equipe } = await supabase
      .from('usuarios')
      .select('id')
      .eq('gerente_id', usuario.id)
      .eq('ativo', true)
      .is('deleted_at', null)
    idsFiltro.push(...(equipe ?? []).map((u) => u.id))
    idsFiltro.push(usuario.id) // inclui o próprio gerente se tiver clientes
  }

  const dataInicioStr = dataInicio.slice(0, 10)
  const dataFimStr = dataFim.slice(0, 10)

  const periodoLabel = `${new Date(dataInicioStr + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFimStr + 'T00:00:00').toLocaleDateString('pt-BR')}`

  const geradoEm = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  switch (tipo) {
    case 'producao':
      return gerarRelatorioProducao(supabase, idsFiltro, ehCorretor ? usuario.id : null, dataInicioStr, dataFimStr, periodoLabel, geradoEm)
    case 'funil':
      return gerarRelatorioFunil(supabase, idsFiltro, ehCorretor ? usuario.id : null, dataInicioStr, dataFimStr, periodoLabel, geradoEm)
    case 'clientes':
      return gerarRelatorioClientes(supabase, idsFiltro, ehCorretor ? usuario.id : null, dataInicioStr, dataFimStr, periodoLabel, geradoEm)
    case 'financeiro':
      return gerarRelatorioFinanceiro(supabase, idsFiltro, ehCorretor ? usuario.id : null, dataInicioStr, dataFimStr, periodoLabel, geradoEm)
    default:
      throw new Error('Tipo de relatório inválido.')
  }
}

// ── Relatório de Produção ────────────────────────────────────────────────────

async function gerarRelatorioProducao(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  idsFiltro: string[],
  corretorId: string | null,
  dataInicio: string,
  dataFim: string,
  periodoLabel: string,
  geradoEm: string
): Promise<DadosRelatorio> {
  let query = supabase
    .from('producao_diaria')
    .select('data, ligacoes, whatsapp, follow_ups, agendamentos, comparecimentos, pastas, aprovacoes, vendas, pontuacao_gamificacao')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true })

  if (corretorId) {
    query = query.eq('usuario_id', corretorId)
  } else if (idsFiltro.length > 0) {
    query = query.in('usuario_id', idsFiltro)
  }

  const { data } = await query

  const linhas = (data ?? []).map((d) => ({
    'Data': new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR'),
    'Ligações': d.ligacoes,
    'WhatsApp': d.whatsapp,
    'Follow-ups': d.follow_ups,
    'Agendamentos': d.agendamentos,
    'Comparecimentos': d.comparecimentos,
    'Pastas': d.pastas,
    'Aprovações': d.aprovacoes,
    'Vendas': d.vendas,
    'Pontuação': d.pontuacao_gamificacao,
  }))

  const totais = (data ?? []).reduce(
    (acc, d) => ({
      ligacoes: acc.ligacoes + d.ligacoes,
      whatsapp: acc.whatsapp + d.whatsapp,
      agendamentos: acc.agendamentos + d.agendamentos,
      comparecimentos: acc.comparecimentos + d.comparecimentos,
      pastas: acc.pastas + d.pastas,
      aprovacoes: acc.aprovacoes + d.aprovacoes,
      vendas: acc.vendas + d.vendas,
    }),
    { ligacoes: 0, whatsapp: 0, agendamentos: 0, comparecimentos: 0, pastas: 0, aprovacoes: 0, vendas: 0 }
  )

  return {
    titulo: 'Relatório de Produção',
    periodo: periodoLabel,
    geradoEm,
    colunas: ['Data', 'Ligações', 'WhatsApp', 'Follow-ups', 'Agendamentos', 'Comparecimentos', 'Pastas', 'Aprovações', 'Vendas', 'Pontuação'],
    linhas,
    resumo: [
      { label: 'Total de Ligações', valor: totais.ligacoes },
      { label: 'Total de WhatsApp', valor: totais.whatsapp },
      { label: 'Total de Agendamentos', valor: totais.agendamentos },
      { label: 'Total de Comparecimentos', valor: totais.comparecimentos },
      { label: 'Total de Pastas', valor: totais.pastas },
      { label: 'Total de Aprovações', valor: totais.aprovacoes },
      { label: 'Total de Vendas', valor: totais.vendas },
    ],
  }
}

// ── Relatório de Funil ───────────────────────────────────────────────────────

async function gerarRelatorioFunil(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  idsFiltro: string[],
  corretorId: string | null,
  dataInicio: string,
  dataFim: string,
  periodoLabel: string,
  geradoEm: string
): Promise<DadosRelatorio> {
  let query = supabase
    .from('clientes')
    .select('etapa_atual')
    .is('deleted_at', null)

  if (corretorId) {
    query = query.eq('corretor_responsavel_id', corretorId)
  } else if (idsFiltro.length > 0) {
    query = query.in('corretor_responsavel_id', idsFiltro)
  }

  const { data } = await query

  const etapas = [
    'NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO',
    'ANALISE', 'RESTRICOES', 'CONDICIONADOS', 'APROVADOS',
    'FECHAMENTOS', 'POS_VENDA',
  ]

  const labels: Record<string, string> = {
    NOVO_LEAD: 'Novo Lead',
    CONTATOS: 'Contatos',
    AGENDAMENTO: 'Agendamento',
    COMPARECIMENTO: 'Comparecimento',
    ANALISE: 'Análise',
    RESTRICOES: 'Restrições',
    CONDICIONADOS: 'Condicionados',
    APROVADOS: 'Aprovados',
    FECHAMENTOS: 'Fechamentos',
    POS_VENDA: 'Pós-Venda',
  }

  const total = (data ?? []).length

  const linhas = etapas.map((etapa, i) => {
    const qtd = (data ?? []).filter((c) => c.etapa_atual === etapa).length
    const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) : '0'
    const anterior = i > 0 ? (data ?? []).filter((c) => c.etapa_atual === etapas[i - 1]).length : qtd
    const conversao = anterior > 0 ? ((qtd / anterior) * 100).toFixed(1) : '—'
    return {
      'Etapa': labels[etapa],
      'Clientes': qtd,
      '% do Total': `${pct}%`,
      'Conversão': `${conversao}%`,
    }
  })

  return {
    titulo: 'Relatório de Funil de Vendas',
    periodo: periodoLabel,
    geradoEm,
    colunas: ['Etapa', 'Clientes', '% do Total', 'Conversão'],
    linhas,
    resumo: [
      { label: 'Total de Clientes', valor: total },
      { label: 'Topo do Funil (Lead + Contatos)', valor: (data ?? []).filter((c) => c.etapa_atual === 'NOVO_LEAD' || c.etapa_atual === 'CONTATOS').length },
      { label: 'Em Negociação', valor: (data ?? []).filter((c) => ['AGENDAMENTO', 'COMPARECIMENTO', 'ANALISE'].includes(c.etapa_atual)).length },
      { label: 'Convertidos (Fechamentos + Pós-Venda)', valor: (data ?? []).filter((c) => c.etapa_atual === 'FECHAMENTOS' || c.etapa_atual === 'POS_VENDA').length },
    ],
  }
}

// ── Relatório de Clientes ────────────────────────────────────────────────────

async function gerarRelatorioClientes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  idsFiltro: string[],
  corretorId: string | null,
  dataInicio: string,
  dataFim: string,
  periodoLabel: string,
  geradoEm: string
): Promise<DadosRelatorio> {
  let query = supabase
    .from('clientes')
    .select('nome, cpf, telefone, etapa_atual, empreendimento_interesse, created_at, ultima_atividade_em, pasta_completa_em, ficha_proposta_assinada')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (corretorId) {
    query = query.eq('corretor_responsavel_id', corretorId)
  } else if (idsFiltro.length > 0) {
    query = query.in('corretor_responsavel_id', idsFiltro)
  }

  const { data } = await query

  const labelsEtapa: Record<string, string> = {
    NOVO_LEAD: 'Novo Lead',
    CONTATOS: 'Contatos',
    AGENDAMENTO: 'Agendamento',
    COMPARECIMENTO: 'Comparecimento',
    ANALISE: 'Análise',
    RESTRICOES: 'Restrições',
    CONDICIONADOS: 'Condicionados',
    APROVADOS: 'Aprovados',
    FECHAMENTOS: 'Fechamentos',
    POS_VENDA: 'Pós-Venda',
  }

  const linhas = (data ?? []).map((c) => {
    const cpfFormatado = c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    const telFormatado = c.telefone.length === 11
      ? `(${c.telefone.slice(0, 2)}) ${c.telefone.slice(2, 7)}-${c.telefone.slice(7)}`
      : `(${c.telefone.slice(0, 2)}) ${c.telefone.slice(2, 6)}-${c.telefone.slice(6)}`

    return {
      'Nome': c.nome,
      'CPF': cpfFormatado,
      'Telefone': telFormatado,
      'Etapa': labelsEtapa[c.etapa_atual] ?? c.etapa_atual,
      'Empreendimento': c.empreendimento_interesse ?? '—',
      'Cadastro': new Date(c.created_at).toLocaleDateString('pt-BR'),
      'Última Atividade': new Date(c.ultima_atividade_em).toLocaleDateString('pt-BR'),
      'Pasta OK': c.pasta_completa_em ? 'Sim' : 'Não',
      'Fechado': c.ficha_proposta_assinada ? 'Sim' : 'Não',
    }
  })

  return {
    titulo: 'Relatório de Clientes',
    periodo: periodoLabel,
    geradoEm,
    colunas: ['Nome', 'CPF', 'Telefone', 'Etapa', 'Empreendimento', 'Cadastro', 'Última Atividade', 'Pasta OK', 'Fechado'],
    linhas,
    resumo: [
      { label: 'Total de Clientes', valor: linhas.length },
      { label: 'Pastas Completas', valor: (data ?? []).filter((c) => c.pasta_completa_em).length },
      { label: 'Fichas Assinadas', valor: (data ?? []).filter((c) => c.ficha_proposta_assinada).length },
    ],
  }
}

// ── Relatório Financeiro ─────────────────────────────────────────────────────

async function gerarRelatorioFinanceiro(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  idsFiltro: string[],
  corretorId: string | null,
  dataInicio: string,
  dataFim: string,
  periodoLabel: string,
  geradoEm: string
): Promise<DadosRelatorio> {
  let query = supabase
    .from('clientes')
    .select('nome, vgv, comissao_percentual, comissao_valor, data_fechamento, etapa_atual, corretor_responsavel_id, usuarios!inner(nome)')
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', dataInicio + 'T00:00:00')
    .lte('data_fechamento', dataFim + 'T23:59:59')
    .is('deleted_at', null)
    .order('data_fechamento', { ascending: false })

  if (corretorId) {
    query = query.eq('corretor_responsavel_id', corretorId)
  } else if (idsFiltro.length > 0) {
    query = query.in('corretor_responsavel_id', idsFiltro)
  }

  const { data } = await query

  const linhas = (data ?? []).map((c) => {
    const dados = c as unknown as {
      nome: string
      vgv: number | null
      comissao_percentual: number | null
      comissao_valor: number | null
      data_fechamento: string
      usuarios: { nome: string }
    }
    return {
      'Cliente': dados.nome,
      'Corretor': dados.usuarios?.nome ?? '—',
      'Data Fechamento': dados.data_fechamento ? new Date(dados.data_fechamento).toLocaleDateString('pt-BR') : '—',
      'VGV': dados.vgv != null ? dados.vgv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—',
      '% Comissão': dados.comissao_percentual != null ? `${dados.comissao_percentual}%` : '—',
      'Comissão': dados.comissao_valor != null ? dados.comissao_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—',
    }
  })

  const vgvTotal = (data ?? []).reduce((acc, c) => {
    const d = c as unknown as { vgv: number | null }
    return acc + (d.vgv ?? 0)
  }, 0)

  const comissaoTotal = (data ?? []).reduce((acc, c) => {
    const d = c as unknown as { comissao_valor: number | null }
    return acc + (d.comissao_valor ?? 0)
  }, 0)

  return {
    titulo: 'Relatório Financeiro (VGV e Comissões)',
    periodo: periodoLabel,
    geradoEm,
    colunas: ['Cliente', 'Corretor', 'Data Fechamento', 'VGV', '% Comissão', 'Comissão'],
    linhas,
    resumo: [
      { label: 'Total de Fechamentos', valor: linhas.length },
      { label: 'VGV Total', valor: vgvTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      { label: 'Comissão Total', valor: comissaoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    ],
  }
}