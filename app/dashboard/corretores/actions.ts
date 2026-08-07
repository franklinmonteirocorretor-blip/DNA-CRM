'use server'

import { requirePermission } from '@/src/lib/auth/guards'
import { escaparLike } from '@/src/lib/sql-utils'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import {
  CorretorGestao,
  PerfilCorretor,
  CorretoresFiltros,
  TransferenciaCarteira,
  Usuario,
  Equipe,
} from '@/src/types'

// ─── Lista de corretores (página principal) ──────────────────────────────────

export async function listarCorretores(filtros?: CorretoresFiltros): Promise<CorretorGestao[]> {
  await requirePermission('corretores', 'visualizar')
  const supabase = await createSupabaseServerClient()

  let query = supabase.from('usuarios')
    .select('*, equipes!usuarios_equipe_id_fkey(nome), supervisor:usuarios!usuarios_supervisor_id_fkey(nome)')
    .is('deleted_at', null)
    .order('nome')

  if (filtros?.busca) {
    const buscaEscapada = escaparLike(filtros.busca)
    query = query.or(`nome.ilike.%${buscaEscapada}%,email.ilike.%${buscaEscapada}%`)
  }
  if (filtros?.status && filtros.status !== 'TODOS') {
    query = query.eq('status_usuario', filtros.status)
  }
  if (filtros?.equipeId) {
    query = query.eq('equipe_id', filtros.equipeId)
  }
  if (filtros?.supervisorId) {
    query = query.eq('supervisor_id', filtros.supervisorId)
  }

  const { data: usuarios, error: usuariosError } = await query
  if (usuariosError) throw new Error(usuariosError.message)

  // Busca produção do mês atual para todos
  const hoje = new Date()
  const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const hojeStr = new Date().toISOString().slice(0, 10)
  const ids = (usuarios ?? []).map((u) => u.id)

  const { data: producaoMes, error: prodMesError } = ids.length > 0
    ? await supabase.from('producao_diaria')
        .select('*')
        .in('usuario_id', ids)
        .gte('data', inicioMes)
        .lte('data', hojeStr)
    : { data: [], error: null }
  if (prodMesError) throw new Error(prodMesError.message)

  const { data: producaoHoje, error: prodHojeError } = ids.length > 0
    ? await supabase.from('producao_diaria')
        .select('*')
        .in('usuario_id', ids)
        .eq('data', hojeStr)
    : { data: [], error: null }
  if (prodHojeError) throw new Error(prodHojeError.message)

  const METAS_DIARIAS = { ligacoes: 80, whatsapps: 40, followUps: 20, agendamentos: 2, comparecimentos: 2, pastas: 1 }

  // Batch: VGV e comissão por corretor (todos de uma vez)
  const { data: todasVendasMes, error: vendasMesError } = ids.length > 0
    ? await supabase
        .from('clientes')
        .select('corretor_responsavel_id, vgv, comissao_valor')
        .in('corretor_responsavel_id', ids)
        .eq('ficha_proposta_assinada', true)
        .gte('data_fechamento', `${inicioMes}T00:00:00`)
        .is('deleted_at', null)
    : { data: [], error: null }
  if (vendasMesError) throw new Error(vendasMesError.message)

  // Batch: total de clientes por corretor
  const { data: todosClientes, error: clientesError } = ids.length > 0
    ? await supabase
        .from('clientes')
        .select('corretor_responsavel_id')
        .in('corretor_responsavel_id', ids)
        .is('deleted_at', null)
    : { data: [], error: null }
  if (clientesError) throw new Error(clientesError.message)

  // Agrega VGV e comissão por corretor
  const vgvPorCorretor: Record<string, number> = {}
  const comissaoPorCorretor: Record<string, number> = {}
  for (const v of todasVendasMes ?? []) {
    vgvPorCorretor[v.corretor_responsavel_id] = (vgvPorCorretor[v.corretor_responsavel_id] ?? 0) + (v.vgv ?? 0)
    comissaoPorCorretor[v.corretor_responsavel_id] = (comissaoPorCorretor[v.corretor_responsavel_id] ?? 0) + (v.comissao_valor ?? 0)
  }

  // Total de clientes por corretor
  const clientesPorCorretor: Record<string, number> = {}
  for (const c of todosClientes ?? []) {
    clientesPorCorretor[c.corretor_responsavel_id] = (clientesPorCorretor[c.corretor_responsavel_id] ?? 0) + 1
  }

  return (usuarios ?? []).map((u) => {
    const prodMesArr = (producaoMes ?? []).filter((p) => p.usuario_id === u.id)
    const prodHoje = (producaoHoje ?? []).find((p) => p.usuario_id === u.id)

    const somaMes = prodMesArr.reduce((acc, p) => {
      acc.ligacoes += p.ligacoes
      acc.whatsapps += p.whatsapp
      acc.followUps += p.follow_ups
      acc.agendamentos += p.agendamentos
      acc.comparecimentos += p.comparecimentos
      acc.pastas += p.pastas
      acc.aprovacoes += p.aprovacoes
      acc.vendas += p.vendas
      return acc
    }, { ligacoes: 0, whatsapps: 0, followUps: 0, agendamentos: 0, comparecimentos: 0, pastas: 0, aprovacoes: 0, vendas: 0 })

    // Meta diária
    const pctsDiarios = [
      Math.min(100, ((prodHoje?.ligacoes ?? 0) / METAS_DIARIAS.ligacoes) * 100),
      Math.min(100, ((prodHoje?.whatsapp ?? 0) / METAS_DIARIAS.whatsapps) * 100),
      Math.min(100, ((prodHoje?.follow_ups ?? 0) / METAS_DIARIAS.followUps) * 100),
      Math.min(100, ((prodHoje?.agendamentos ?? 0) / METAS_DIARIAS.agendamentos) * 100),
      Math.min(100, ((prodHoje?.comparecimentos ?? 0) / METAS_DIARIAS.comparecimentos) * 100),
      Math.min(100, ((prodHoje?.pastas ?? 0) / METAS_DIARIAS.pastas) * 100),
    ]
    const metaDiaria = Math.round(pctsDiarios.reduce((a, b) => a + b, 0) / pctsDiarios.length)

    // Meta mensal (proporcional)
    const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
    const metasMensais = {
      ligacoes: METAS_DIARIAS.ligacoes * diasMes,
      whatsapps: METAS_DIARIAS.whatsapps * diasMes,
      followUps: METAS_DIARIAS.followUps * diasMes,
      agendamentos: METAS_DIARIAS.agendamentos * diasMes,
      comparecimentos: METAS_DIARIAS.comparecimentos * diasMes,
      pastas: METAS_DIARIAS.pastas * diasMes,
    }
    const pctsMensais = [
      Math.min(100, (somaMes.ligacoes / metasMensais.ligacoes) * 100),
      Math.min(100, (somaMes.whatsapps / metasMensais.whatsapps) * 100),
      Math.min(100, (somaMes.followUps / metasMensais.followUps) * 100),
      Math.min(100, (somaMes.agendamentos / metasMensais.agendamentos) * 100),
      Math.min(100, (somaMes.comparecimentos / metasMensais.comparecimentos) * 100),
      Math.min(100, (somaMes.pastas / metasMensais.pastas) * 100),
    ]
    const metaMensal = Math.round(pctsMensais.reduce((a, b) => a + b, 0) / pctsMensais.length)

    // VGV e comissao do batch
    const vgv = vgvPorCorretor[u.id] ?? 0
    const comissao = comissaoPorCorretor[u.id] ?? 0
    const totalClientes = clientesPorCorretor[u.id] ?? 0
    const conversao = totalClientes > 0 ? Math.round((somaMes.vendas / totalClientes) * 100) : 0

    const equipesData = u.equipes as unknown as { nome: string } | null
    const supervisorData = u.supervisor as unknown as { nome: string } | null

    return {
      ...u,
      ativo: u.ativo,
      perfil: u.perfil,
      status_usuario: u.status_usuario,
      cpf: u.cpf ?? null,
      creci: u.creci ?? null,
      data_admissao: u.data_admissao ?? null,
      cargo: u.cargo ?? null,
      supervisor_id: u.supervisor_id ?? null,
      equipe_id: u.equipe_id ?? null,
      equipeNome: equipesData?.nome ?? null,
      supervisorNome: supervisorData?.nome ?? null,
      kpisMensais: {
        ligacoes: somaMes.ligacoes,
        whatsapps: somaMes.whatsapps,
        followUps: somaMes.followUps,
        agendamentos: somaMes.agendamentos,
        comparecimentos: somaMes.comparecimentos,
        pastas: somaMes.pastas,
        aprovacoes: somaMes.aprovacoes,
        vendas: somaMes.vendas,
        vgv,
        comissao,
        conversao,
      },
      metaDiaria,
      metaMensal,
      clientesAtivos: totalClientes,
    }
  })
}

// ─── Criar corretor ──────────────────────────────────────────────────────────

export async function criarCorretor(dados: {
  nome: string
  email: string
  telefone?: string
  cpf?: string
  creci?: string
  data_admissao?: string
  cargo?: string
  perfil?: string
  equipe_id?: string
  supervisor_id?: string
}): Promise<{ success: boolean; error?: string; id?: string }> {
  await requirePermission('corretores', 'cadastrar')
  const supabase = await createSupabaseServerClient()

  // Cria usuário no auth (senha temporária)
  const tempPassword = `DNA${Math.random().toString(36).slice(2, 8)}!`
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: dados.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authUser?.user) {
    return { success: false, error: authError?.message ?? 'Erro ao criar usuário de autenticação' }
  }

  const { data: usuario, error: insertError } = await supabase
    .from('usuarios')
    .insert({
      id: authUser.user.id,
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone ?? null,
      cpf: dados.cpf ?? null,
      creci: dados.creci ?? null,
      data_admissao: dados.data_admissao ?? null,
      cargo: dados.cargo ?? null,
      perfil: dados.perfil ?? 'CORRETOR',
      equipe_id: dados.equipe_id ?? null,
      supervisor_id: dados.supervisor_id ?? null,
      status_usuario: 'ATIVO',
    })
    .select('id')
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/dashboard/corretores')
  return { success: true, id: usuario?.id }
}

// ─── Editar corretor ─────────────────────────────────────────────────────────

export async function editarCorretor(
  id: string,
  dados: Partial<{
    nome: string
    email: string
    telefone: string
    cpf: string
    creci: string
    data_admissao: string
    cargo: string
    perfil: string
    equipe_id: string
    supervisor_id: string
    status_usuario: string
  }>
): Promise<{ success: boolean; error?: string }> {
  await requirePermission('corretores', 'editar')
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('usuarios')
    .update(dados)
    .eq('id', id)
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/corretores')
  revalidatePath(`/dashboard/corretores/${id}`)
  return { success: true }
}

// ─── Desativar / Reativar corretor ───────────────────────────────────────────

export async function alterarStatusCorretor(
  id: string,
  novoStatus: 'ATIVO' | 'DESLIGADO' | 'FERIAS' | 'AFASTADO'
): Promise<{ success: boolean; error?: string }> {
  await requirePermission('corretores', 'desativar')
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('usuarios')
    .update({ status_usuario: novoStatus })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/corretores')
  return { success: true }
}

// ─── Transferir carteira de clientes ─────────────────────────────────────────

export async function transferirCarteira(dados: TransferenciaCarteira): Promise<{ success: boolean; error?: string }> {
  await requirePermission('corretores', 'transferir_carteira')
  const supabase = await createSupabaseServerClient()

  if (dados.transferirClientes) {
    const { error } = await supabase
      .from('clientes')
      .update({ corretor_responsavel_id: dados.destinoId })
      .eq('corretor_responsavel_id', dados.origemId)

    if (error) return { success: false, error: error.message }
  }

  if (dados.transferirAgendamentos) {
    const { error } = await supabase
      .from('agendamentos')
      .update({ corretor_id: dados.destinoId })
      .eq('corretor_id', dados.origemId)
      .in('status', ['AGENDADO', 'CONFIRMADO', 'REMARCADO'])

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/corretores')
  return { success: true }
}

// ─── Perfil completo do corretor ─────────────────────────────────────────────

export async function perfilCorretor(id: string): Promise<PerfilCorretor | null> {
  await requirePermission('corretores', 'visualizar')
  const supabase = await createSupabaseServerClient()

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('*, equipes!usuarios_equipe_id_fkey(nome), supervisor:usuarios!usuarios_supervisor_id_fkey(nome)')
    .eq('id', id)
    .single()

  if (usuarioError) throw new Error(usuarioError.message)
  if (!usuario) return null

  // Produção diária (últimos 30 dias)
  const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const hojeStr = new Date().toISOString().slice(0, 10)
  const { data: producaoDiaria, error: prodDiariaError } = await supabase
    .from('producao_diaria')
    .select('*')
    .eq('usuario_id', id)
    .gte('data', trintaDiasAtras)
    .lte('data', hojeStr)
    .order('data', { ascending: true })
  if (prodDiariaError) throw new Error(prodDiariaError.message)

  // Produção mensal (últimos 12 meses)
  const { data: producaoMensalRaw, error: prodMensalError } = await supabase
    .from('producao_diaria')
    .select('data, vendas, aprovacoes, pontuacao_gamificacao')
    .eq('usuario_id', id)
    .gte('data', `${new Date().getFullYear() - 1}-01-01`)
    .order('data', { ascending: true })
  if (prodMensalError) throw new Error(prodMensalError.message)

  const porMes: Record<string, { vendas: number; vgv: number; comissao: number; aprovacoes: number; pontuacao: number }> = {}
  for (const p of producaoMensalRaw ?? []) {
    const mes = p.data.slice(0, 7)
    if (!porMes[mes]) porMes[mes] = { vendas: 0, vgv: 0, comissao: 0, aprovacoes: 0, pontuacao: 0 }
    porMes[mes].vendas += p.vendas
    porMes[mes].aprovacoes += p.aprovacoes
    porMes[mes].pontuacao += p.pontuacao_gamificacao
  }

  // VGV e comissao mensal — single batch query instead of N+1 per month
  const minMes = Object.keys(porMes).sort()[0] ?? new Date().toISOString().slice(0, 7)
  const maxMes = Object.keys(porMes).sort().pop() ?? new Date().toISOString().slice(0, 7)
  const { data: todasVendasMensais, error: vendasBatchError } = await supabase
    .from('clientes')
    .select('vgv, comissao_valor, data_fechamento')
    .eq('corretor_responsavel_id', id)
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${minMes}-01T00:00:00`)
    .lte('data_fechamento', `${maxMes}-31T23:59:59`)
    .is('deleted_at', null)
  if (vendasBatchError) throw new Error(vendasBatchError.message)
  for (const v of todasVendasMensais ?? []) {
    if (!v.data_fechamento) continue
    const mesVenda = v.data_fechamento.slice(0, 7)
    if (porMes[mesVenda]) {
      porMes[mesVenda].vgv += v.vgv ?? 0
      porMes[mesVenda].comissao += v.comissao_valor ?? 0
    }
  }

  const producaoMensal = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, dados]) => ({ mes, ...dados }))

  // Produção anual
  const porAno: Record<string, { vendas: number; vgv: number; comissao: number; pontuacao: number }> = {}
  for (const p of producaoMensalRaw ?? []) {
    const ano = p.data.slice(0, 4)
    if (!porAno[ano]) porAno[ano] = { vendas: 0, vgv: 0, comissao: 0, pontuacao: 0 }
    porAno[ano].vendas += p.vendas
    porAno[ano].pontuacao += p.pontuacao_gamificacao
  }
  // VGV e comissao anual — single batch query instead of N+1 per year
  const minAno = Object.keys(porAno).sort()[0] ?? new Date().getFullYear().toString()
  const maxAno = Object.keys(porAno).sort().pop() ?? new Date().getFullYear().toString()
  const { data: todasVendasAnuais, error: vendasAnoBatchError } = await supabase
    .from('clientes')
    .select('vgv, comissao_valor, data_fechamento')
    .eq('corretor_responsavel_id', id)
    .eq('ficha_proposta_assinada', true)
    .gte('data_fechamento', `${minAno}-01-01T00:00:00`)
    .lte('data_fechamento', `${maxAno}-12-31T23:59:59`)
    .is('deleted_at', null)
  if (vendasAnoBatchError) throw new Error(vendasAnoBatchError.message)
  for (const v of todasVendasAnuais ?? []) {
    if (!v.data_fechamento) continue
    const anoVenda = v.data_fechamento.slice(0, 4)
    if (porAno[anoVenda]) {
      porAno[anoVenda].vgv += v.vgv ?? 0
      porAno[anoVenda].comissao += v.comissao_valor ?? 0
    }
  }
  const producaoAnual = Object.entries(porAno)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ano, dados]) => ({ ano, ...dados }))

  // Clientes ativos (primeiros 10)
  const { data: clientes, error: clientesPerfilError } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual')
    .eq('corretor_responsavel_id', id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(10)
  if (clientesPerfilError) throw new Error(clientesPerfilError.message)

  // Ranking (fn_ranking_mes)
  const { data: ranking, error: rankingError } = await supabase.rpc('fn_ranking_mes')
  if (rankingError) throw new Error(rankingError.message)
  const posicao = (ranking ?? []).findIndex((r: { usuario_id: string }) => r.usuario_id === id) + 1
  const pontuacao = (ranking ?? []).find((r: { usuario_id: string }) => r.usuario_id === id)?.pontos ?? 0

  // Próximos agendamentos
  const { data: agendamentos, error: agendError } = await supabase
    .from('agendamentos')
    .select('id, data_hora, status, clientes(nome)')
    .eq('corretor_id', id)
    .gte('data_hora', new Date().toISOString())
    .in('status', ['AGENDADO', 'CONFIRMADO', 'REMARCADO'])
    .order('data_hora', { ascending: true })
    .limit(10)
  if (agendError) throw new Error(agendError.message)

  const equipesData = usuario.equipes as unknown as { nome: string } | null
  const supervisorData = usuario.supervisor as unknown as { nome: string } | null

  return {
    usuario: usuario as Usuario,
    equipeNome: equipesData?.nome ?? null,
    supervisorNome: supervisorData?.nome ?? null,
    producaoDiaria: (producaoDiaria ?? []).map((p) => ({
      data: p.data,
      ligacoes: p.ligacoes,
      whatsapp: p.whatsapp,
      followUps: p.follow_ups,
      agendamentos: p.agendamentos,
      comparecimentos: p.comparecimentos,
      pastas: p.pastas,
      aprovacoes: p.aprovacoes,
      vendas: p.vendas,
      pontuacao: p.pontuacao_gamificacao,
    })),
    producaoMensal,
    producaoAnual,
    clientes: (clientes ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      etapa: c.etapa_atual,
    })),
    ranking: { posicao, pontuacao },
    proximosAgendamentos: (agendamentos ?? []).map((a) => ({
      id: a.id,
      clienteNome: (a.clientes as unknown as { nome: string })?.nome ?? '',
      dataHora: a.data_hora,
      status: a.status,
    })),
  }
}

// ─── Listar equipes (para selects/filtros) ───────────────────────────────────

export async function listarEquipes(): Promise<Equipe[]> {
  await requirePermission('corretores', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('equipes')
    .select('*')
    .is('deleted_at', null)
    .order('nome')
  if (error) throw new Error(error.message)
  return (data ?? []) as Equipe[]
}

// ─── Listar supervisores/gerentes (para selects) ─────────────────────────────

export async function listarSupervisores(): Promise<{ id: string; nome: string }[]> {
  await requirePermission('corretores', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome')
    .in('perfil', ['GERENTE', 'SUPERVISOR', 'ADMINISTRADOR'])
    .eq('status_usuario', 'ATIVO')
    .is('deleted_at', null)
    .order('nome')
  if (error) throw new Error(error.message)
  return (data ?? []) as { id: string; nome: string }[]
}

// ─── Dashboard: resumo da equipe ─────────────────────────────────────────────

export async function resumoEquipeDashboard(): Promise<{
  corretoresAtivos: number
  corretoresOnline: number
  producaoDia: { ligacoes: number; whatsapps: number; agendamentos: number; comparecimentos: number }
}> {
  await requirePermission('equipe', 'visualizar')
  const supabase = await createSupabaseServerClient()
  const hojeStr = new Date().toISOString().slice(0, 10)

  const { count: corretoresAtivos, error: countError } = await supabase
    .from('usuarios')
    .select('*', { count: 'exact', head: true })
    .eq('status_usuario', 'ATIVO')
    .is('deleted_at', null)
  if (countError) throw new Error(countError.message)

  // "Online" = tiveram atividade hoje
  const { data: prodHoje, error: prodHojeError } = await supabase
    .from('producao_diaria')
    .select('usuario_id, ligacoes, whatsapp, agendamentos, comparecimentos')
    .eq('data', hojeStr)
  if (prodHojeError) throw new Error(prodHojeError.message)

  const usuariosAtivos = [...new Set((prodHoje ?? []).map((p) => p.usuario_id))]

  const producaoDia = (prodHoje ?? []).reduce(
    (acc, p) => {
      acc.ligacoes += p.ligacoes ?? 0
      acc.whatsapps += p.whatsapp ?? 0
      acc.agendamentos += p.agendamentos ?? 0
      acc.comparecimentos += p.comparecimentos ?? 0
      return acc
    },
    { ligacoes: 0, whatsapps: 0, agendamentos: 0, comparecimentos: 0 }
  )

  return {
    corretoresAtivos: corretoresAtivos ?? 0,
    corretoresOnline: usuariosAtivos.length,
    producaoDia,
  }
}