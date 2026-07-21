'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import { AgendaEvent, AgendaFiltros, AgendaResumo, StatusAgendamento, ResultadoComparecimento, EtapaFunil } from '@/src/types'

/**
 * Busca todos os agendamentos enriquecidos para o calendário.
 * Aplica os filtros recebidos (corretor, empreendimento, status, período, cliente).
 */
export async function listarAgendamentos(filtros: AgendaFiltros) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.', eventos: [] }
  }

  // Busca o perfil do usuário para determinar se é gerente/admin
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  const ehGerenteOuAdmin = usuario?.perfil === 'GERENTE' || usuario?.perfil === 'ADMINISTRADOR'

  // Query base: agendamentos + comparecimentos + cliente + empreendimento + corretor
  let query = supabase
    .from('agendamentos')
    .select(`
      *,
      comparecimentos(*),
      clientes!inner(id, nome, telefone, email, etapa_atual),
      empreendimentos(id, nome)
    `)
    .order('data_hora', { ascending: true })

  // Filtro: período
  if (filtros.dataInicio) {
    query = query.gte('data_hora', filtros.dataInicio)
  }
  if (filtros.dataFim) {
    query = query.lte('data_hora', filtros.dataFim)
  }

  // Filtro: corretor (apenas gerentes/admins podem filtrar por outros)
  if (filtros.corretorId && ehGerenteOuAdmin) {
    query = query.eq('corretor_id', filtros.corretorId)
  } else if (!ehGerenteOuAdmin) {
    // Corretores só veem seus próprios agendamentos
    query = query.eq('corretor_id', user.id)
  }

  // Filtro: empreendimento
  if (filtros.empreendimentoId) {
    query = query.eq('empreendimento_id', filtros.empreendimentoId)
  }

  // Filtro: status
  if (filtros.status) {
    if (filtros.status === 'COMPARECEU' || filtros.status === 'NAO_COMPARECEU') {
      // Filtra por comparecimento — precisa de subquery ou post-filter
      // Vamos filtrar do lado do servidor após a query
      query = query.eq('status', 'AGENDADO') // base, o post-filter cuida do resto
    } else {
      query = query.eq('status', filtros.status)
    }
  }

  // Filtro: busca textual por cliente
  if (filtros.clienteBusca) {
    const busca = filtros.clienteBusca.trim()
    if (busca.length >= 2) {
      // Usa ilike para busca parcial no nome do cliente
      query = query.ilike('clientes.nome', `%${busca}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    return { erro: error.message, eventos: [] }
  }

  // Define um tipo intermediário para o row retornado pelo Supabase
type AgendamentoJoinRow = {
  id: string
  cliente_id: string
  corretor_id: string
  empreendimento_interesse: string | null
  empreendimento_id: string | null
  data_hora: string
  status: string
  local: string | null
  observacao: string | null
  created_at: string
  updated_at: string
  comparecimentos: Array<{
    id: string
    agendamento_id: string
    resultado: string
    motivo_ausencia: string | null
    observacao: string | null
    created_at: string
  }> | null
  clientes: { id: string; nome: string; telefone: string; email: string | null; etapa_atual: string }
  empreendimentos: { id: string; nome: string } | null
}

  // Monta os eventos enriquecidos
  let eventos: AgendaEvent[] = (data ?? []).map((row) => {
    const r = row as unknown as AgendamentoJoinRow
    return {
      agendamento: {
        id: r.id,
        cliente_id: r.cliente_id,
        corretor_id: r.corretor_id,
        empreendimento_interesse: r.empreendimento_interesse,
        empreendimento_id: r.empreendimento_id,
        data_hora: r.data_hora,
        status: r.status as StatusAgendamento,
        local: r.local,
        observacao: r.observacao,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
      comparecimento: r.comparecimentos?.[0]
        ? {
            id: r.comparecimentos[0].id,
            agendamento_id: r.comparecimentos[0].agendamento_id,
            resultado: r.comparecimentos[0].resultado as ResultadoComparecimento,
            motivo_ausencia: r.comparecimentos[0].motivo_ausencia,
            observacao: r.comparecimentos[0].observacao,
            created_at: r.comparecimentos[0].created_at,
          }
        : null,
      cliente: {
        id: r.clientes.id,
        nome: r.clientes.nome,
        telefone: r.clientes.telefone,
        email: r.clientes.email,
        etapa_atual: r.clientes.etapa_atual as EtapaFunil,
      },
      corretor: {
        id: r.corretor_id,
        nome: '', // será preenchido abaixo
      },
      empreendimento: r.empreendimentos ?? null,
    }
  })

  // Post-filter: status de comparecimento
  if (filtros.status === 'COMPARECEU') {
    eventos = eventos.filter((e) => e.comparecimento?.resultado === 'COMPARECEU')
  } else if (filtros.status === 'NAO_COMPARECEU') {
    eventos = eventos.filter((e) => e.comparecimento?.resultado === 'NAO_COMPARECEU')
  }

  // Busca os nomes dos corretores (batch query)
  const corretorIds = [...new Set(eventos.map((e) => e.agendamento.corretor_id))]
  if (corretorIds.length > 0) {
    const { data: corretores } = await supabase
      .from('usuarios')
      .select('id, nome')
      .in('id', corretorIds)

    const mapa = (corretores ?? []).reduce(
      (acc, c) => { acc[c.id] = c.nome; return acc },
      {} as Record<string, string>
    )

    eventos = eventos.map((e) => ({
      ...e,
      corretor: { id: e.agendamento.corretor_id, nome: mapa[e.agendamento.corretor_id] ?? '—' },
    }))
  }

  return { eventos }
}

/**
 * Resumo para o card Agenda de Hoje no Dashboard.
 */
export async function resumoAgendaHoje(): Promise<AgendaResumo> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { total: 0, confirmados: 0, pendentes: 0, reagendados: 0, atrasados: 0 }
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeFim = new Date()
  hojeFim.setHours(23, 59, 59, 999)

  // Total de agendamentos hoje
  const { count: total } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .gte('data_hora', hoje.toISOString())
    .lte('data_hora', hojeFim.toISOString())
    .eq('corretor_id', user.id)

  // Confirmados (status CONFIRMADO)
  const { count: confirmados } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .gte('data_hora', hoje.toISOString())
    .lte('data_hora', hojeFim.toISOString())
    .eq('corretor_id', user.id)
    .eq('status', 'CONFIRMADO')

  // Pendentes (AGENDADO)
  const { count: pendentes } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .gte('data_hora', hoje.toISOString())
    .lte('data_hora', hojeFim.toISOString())
    .eq('corretor_id', user.id)
    .eq('status', 'AGENDADO')

  // Reagendados (REMARCADO)
  const { count: reagendados } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .gte('data_hora', hoje.toISOString())
    .lte('data_hora', hojeFim.toISOString())
    .eq('corretor_id', user.id)
    .eq('status', 'REMARCADO')

  // Atrasados (data_hora < now() e status ainda não resolvido)
  const agora = new Date().toISOString()
  const { count: atrasados } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .eq('corretor_id', user.id)
    .lt('data_hora', agora)
    .in('status', ['AGENDADO', 'REMARCADO'])

  return {
    total: total ?? 0,
    confirmados: confirmados ?? 0,
    pendentes: pendentes ?? 0,
    reagendados: reagendados ?? 0,
    atrasados: atrasados ?? 0,
  }
}

// ── Ações de manipulação do agendamento ────────────────────────────────────

/**
 * Confirma um agendamento (status CONFIRMADO).
 */
export async function confirmarAgendamento(agendamentoId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa estar logado.' }

  // Busca o agendamento para pegar o cliente_id
  const { data: ag } = await supabase
    .from('agendamentos')
    .select('cliente_id')
    .eq('id', agendamentoId)
    .single()

  if (!ag) return { erro: 'Agendamento não encontrado.' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'CONFIRMADO' })
    .eq('id', agendamentoId)

  if (error) return { erro: error.message }

  // Atividade automática
  await supabase.from('atividades').insert({
    cliente_id: ag.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Agendamento confirmado',
    observacao: 'Cliente confirmou presença na visita.',
  })

  revalidatePath('/dashboard/agenda')
  revalidatePath(`/dashboard/clientes/${ag.cliente_id}`)
  return { sucesso: true }
}

/**
 * Cancela um agendamento.
 */
export async function cancelarAgendamento(agendamentoId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa estar logado.' }

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('cliente_id')
    .eq('id', agendamentoId)
    .single()

  if (!ag) return { erro: 'Agendamento não encontrado.' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'CANCELADO' })
    .eq('id', agendamentoId)

  if (error) return { erro: error.message }

  await supabase.from('atividades').insert({
    cliente_id: ag.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Agendamento cancelado',
    observacao: 'Visita cancelada pelo corretor.',
  })

  revalidatePath('/dashboard/agenda')
  revalidatePath(`/dashboard/clientes/${ag.cliente_id}`)
  return { sucesso: true }
}

/**
 * Reagenda uma visita — cria novo agendamento e cancela o antigo.
 */
export async function reagendarVisita(input: {
  agendamentoId: string
  novaDataHora: string
  observacao: string | null
}) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa estar logado.' }

  const { data: ag } = await supabase
    .from('agendamentos')
    .select('cliente_id, empreendimento_id')
    .eq('id', input.agendamentoId)
    .single()

  if (!ag) return { erro: 'Agendamento original não encontrado.' }

  const data = new Date(input.novaDataHora)
  if (isNaN(data.getTime()) || data <= new Date()) {
    return { erro: 'A nova data deve ser no futuro.' }
  }

  // Cancela o antigo
  await supabase
    .from('agendamentos')
    .update({ status: 'CANCELADO' })
    .eq('id', input.agendamentoId)

  // Cria novo
  const { error } = await supabase.from('agendamentos').insert({
    cliente_id: ag.cliente_id,
    corretor_id: user.id,
    data_hora: data.toISOString(),
    empreendimento_id: ag.empreendimento_id,
    status: 'REMARCADO',
    observacao: input.observacao?.trim() || null,
  })

  if (error) return { erro: error.message }

  await supabase.from('atividades').insert({
    cliente_id: ag.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Visita reagendada',
    observacao: `Nova data: ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
  })

  revalidatePath('/dashboard/agenda')
  revalidatePath(`/dashboard/clientes/${ag.cliente_id}`)
  return { sucesso: true }
}

/**
 * Confirma comparecimento via painel da agenda.
 * Reaproveita a lógica existente do registrarComparecimento mas exposta de forma independente.
 */
export async function confirmarComparecimentoAgenda(input: {
  agendamentoId: string
  clienteId: string
  resultado: 'COMPARECEU' | 'NAO_COMPARECEU'
  motivoAusencia: string | null
  observacao: string
}) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa estar logado.' }

  // Insere comparecimento (1:1 com agendamento)
  const { error } = await supabase.from('comparecimentos').insert({
    agendamento_id: input.agendamentoId,
    resultado: input.resultado,
    motivo_ausencia: input.resultado === 'NAO_COMPARECEU' ? (input.motivoAusencia?.trim() || null) : null,
    observacao: input.observacao.trim() || null,
  })

  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return { erro: 'Este agendamento já tem comparecimento registrado.' }
    }
    return { erro: error.message }
  }

  // Atividade automática
  const label = input.resultado === 'COMPARECEU' ? 'Cliente compareceu' : 'Cliente não compareceu'
  const obs = input.resultado === 'NAO_COMPARECEU' && input.motivoAusencia
    ? `Motivo: ${input.motivoAusencia}${input.observacao.trim() ? ` — ${input.observacao.trim()}` : ''}`
    : input.observacao.trim() || null

  await supabase.from('atividades').insert({
    cliente_id: input.clienteId,
    usuario_id: user.id,
    tipo: 'LIGACAO' as const,
    resultado: label,
    observacao: obs,
  })

  // Triggers do banco cuidam de: mover etapa, atualizar KPIs, notificações
  revalidatePath('/dashboard/agenda')
  revalidatePath(`/dashboard/clientes/${input.clienteId}`)
  revalidatePath('/dashboard')

  return { sucesso: true }
}

/**
 * Busca dados completos do cliente para o painel lateral.
 */
export async function buscarDetalhesClientePainel(clienteId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  // Cliente completo
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single()

  if (!cliente) return { erro: 'Cliente não encontrado.' }

  // Últimas 10 atividades
  const { data: atividades } = await supabase
    .from('atividades')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Últimos 5 agendamentos
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('*, comparecimentos(*)')
    .eq('cliente_id', clienteId)
    .order('data_hora', { ascending: false })
    .limit(5)

  return {
    cliente,
    atividades: atividades ?? [],
    agendamentos: agendamentos ?? [],
  }
}

/**
 * Busca corretores e empreendimentos para os filtros (dropdowns).
 */
export async function buscarOpcoesFiltros() {
  const supabase = await createSupabaseServerClient()

  const [corretoresRes, empreendimentosRes] = await Promise.all([
    supabase.from('usuarios').select('id, nome').eq('ativo', true).is('deleted_at', null).order('nome'),
    supabase.from('empreendimentos').select('id, nome').eq('ativo', true).is('deleted_at', null).order('nome'),
  ])

  return {
    corretores: corretoresRes.data ?? [],
    empreendimentos: empreendimentosRes.data ?? [],
  }
}