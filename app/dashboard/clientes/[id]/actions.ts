'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import { Cliente, Conjuge, Documento, TipoDocumento, EtapaFunil, CHECKLIST_OBRIGATORIO, Cliente360Evento } from '@/src/types'
import { ETAPA_LABEL_SINGULAR, ETAPA_ORDEM } from '@/src/config/pipeline'
import { dispatchAutomation } from '@/src/lib/automation/engine'

interface RegistrarAtividadeInput {
  cliente_id: string
  tipo: 'LIGACAO' | 'WHATSAPP' | 'FOLLOW_UP'
  observacao: string
}

interface AgendarVisitaInput {
  cliente_id: string
  data_hora: string
  empreendimento_id: string | null
  observacao: string
}

interface UploadDocumentoInput {
  cliente_id: string
  tipo: TipoDocumento
  arquivo_base64: string
  nome_arquivo: string
}

interface RegistrarComparecimentoInput {
  cliente_id: string
  agendamento_id: string
  resultado: 'COMPARECEU' | 'NAO_COMPARECEU'
  motivo_ausencia: string | null
  observacao: string
}

interface RegistrarAnaliseInput {
  cliente_id: string
  resultado: 'RESTRICAO' | 'CONDICIONADO' | 'APROVADO' | 'DOC_PENDENTE'
  observacao: string
}

interface RegistrarFechamentoInput {
  cliente_id: string
}

interface RegistrarPosVendaInput {
  cliente_id: string
  imovel_entregue_em: string | null
  proxima_acao: string | null
  proxima_acao_em: string | null
}

// === SPRINT 1 — Feature 01: Edição de Cliente ===

export interface EditarClienteInput {
  cliente_id: string
  nome: string
  cpf: string           // apenas dígitos (11)
  telefone: string      // apenas dígitos (10 ou 11)
  email: string | null
  renda: number | null
  dependentes: number
  tempo_clt_meses: number | null
  saldo_fgts: number
  eh_casado: boolean
  empreendimento_id: string | null
  observacoes: string | null
}

export async function agendarVisita(input: AgendarVisitaInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  if (!input.data_hora) {
    return { erro: 'Data e hora são obrigatórios.' }
  }

  const data = new Date(input.data_hora)
  if (isNaN(data.getTime())) {
    return { erro: 'Data inválida.' }
  }

  if (data <= new Date()) {
    return { erro: 'A data deve ser no futuro.' }
  }

  const { error, data: agendamentoCriado } = await supabase.from('agendamentos').insert({
    cliente_id: input.cliente_id,
    corretor_id: user.id,
    data_hora: data.toISOString(),
    empreendimento_id: input.empreendimento_id || null,
    status: 'AGENDADO',
  }).select('id').single()

  if (error) {
    return { erro: error.message }
  }

  const agendamentoId = agendamentoCriado?.id

  dispatchAutomation('agendamento_criado', 'agendamento', agendamentoId ?? '', {
    agendamento_id: agendamentoId,
    cliente_id: input.cliente_id,
    data_hora: data.toISOString(),
    empreendimento_id: input.empreendimento_id || null,
  })

  // Também registra uma atividade automaticamente ("Agendou visita")
  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Visita agendada',
    observacao: input.observacao.trim()
      ? `Visita em ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — ${input.observacao.trim()}`
      : `Visita em ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
  })

  // Revalida a página — etapa do cliente muda pelo trigger do banco
  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function registrarAtividade(input: RegistrarAtividadeInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  // Validação mínima
  if (!input.cliente_id || !input.tipo) {
    return { erro: 'Tipo de atividade é obrigatório.' }
  }

  const observacao = input.observacao.trim() || null

  const { error } = await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: input.tipo,
    resultado: null,
    observacao,
  })

  if (error) {
    return { erro: error.message }
  }

  // Revalida o cache da ficha do cliente para as atividades aparecerem
  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function uploadDocumento(input: UploadDocumentoInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  if (!input.tipo || !input.arquivo_base64) {
    return { erro: 'Selecione o tipo de documento e um arquivo.' }
  }

  // Converte base64 para buffer binário
  const partes = input.arquivo_base64.split(',')
  const base64Data = partes.length === 2 ? partes[1] : partes[0]
  const buffer = Buffer.from(base64Data, 'base64')

  // Caminho no bucket: [cliente_id]/[timestamp]-[nome_arquivo]
  const timestamp = Date.now()
  const nomeSeguro = input.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, '_')
  const caminho = `${input.cliente_id}/${timestamp}-${nomeSeguro}`

  // Upload para o bucket documentos
  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(caminho, buffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return { erro: uploadError.message }
  }

  // Gera URL assinada (privada — só usuários autenticados acessam)
  const { data: urlData } = await supabase.storage
    .from('documentos')
    .createSignedUrl(caminho, 60 * 60 * 24 * 365) // 1 ano de validade

  const arquivoUrl = urlData?.signedUrl ?? caminho

  // Registra na tabela documentos
  const { error: insertError, data: docCriado } = await supabase.from('documentos').insert({
    cliente_id: input.cliente_id,
    tipo: input.tipo,
    arquivo_url: arquivoUrl,
    status_validacao: 'PENDENTE',
    enviado_por: user.id,
  }).select('id').single()

  if (insertError) {
    return { erro: insertError.message }
  }

  const documentoId = docCriado?.id

  dispatchAutomation('novo_documento', 'documento', documentoId ?? '', {
    documento_id: documentoId,
    cliente_id: input.cliente_id,
    tipo: input.tipo,
    status_validacao: 'PENDENTE',
  })

  // Registra atividade automática
  const labelDoc: Record<string, string> = {
    RG: 'RG', CPF: 'CPF', CNH: 'CNH', COMPROVANTE_RENDA: 'Comprovante de Renda',
    FGTS: 'FGTS', CONTRATO: 'Contrato', PROPOSTA_PDF: 'Proposta', OUTRO: 'Documento extra',
  }

  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Documento enviado',
    observacao: `${labelDoc[input.tipo] ?? input.tipo} — ${input.nome_arquivo}`,
  })

  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function registrarComparecimento(input: RegistrarComparecimentoInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  if (!input.agendamento_id || !input.resultado) {
    return { erro: 'Agendamento e resultado são obrigatórios.' }
  }

  // Insere o comparecimento (1:1 com agendamento — unique constraint do banco garante)
  const { error, data: compCriado } = await supabase.from('comparecimentos').insert({
    agendamento_id: input.agendamento_id,
    resultado: input.resultado,
    motivo_ausencia: input.resultado === 'NAO_COMPARECEU' ? (input.motivo_ausencia?.trim() || null) : null,
    observacao: input.observacao.trim() || null,
  }).select('id').single()

  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return { erro: 'Este agendamento já tem comparecimento registrado.' }
    }
    return { erro: error.message }
  }

  const comparecimentoId = compCriado?.id

  dispatchAutomation('comparecimento', 'comparecimento', comparecimentoId ?? '', {
    comparecimento_id: comparecimentoId,
    cliente_id: input.cliente_id,
    agendamento_id: input.agendamento_id,
    resultado: input.resultado,
  })

  // Registra atividade automática
  const label = input.resultado === 'COMPARECEU' ? 'Cliente compareceu' : 'Cliente não compareceu'
  const obs = input.resultado === 'NAO_COMPARECEU' && input.motivo_ausencia
    ? `Motivo: ${input.motivo_ausencia}${input.observacao.trim() ? ` — ${input.observacao.trim()}` : ''}`
    : input.observacao.trim() || null

  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'LIGACAO' as const,
    resultado: label,
    observacao: obs,
  })

  // Revalida — o trigger comparecimento_sincroniza_funil move o cliente para COMPARECIMENTO
  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function registrarAnalise(input: RegistrarAnaliseInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  if (!input.resultado) {
    return { erro: 'Selecione o resultado da análise.' }
  }

  // Busca etapa anterior para o dispatch de automação
  const { data: clienteAntesAnalise } = await supabase
    .from('clientes')
    .select('etapa_atual')
    .eq('id', input.cliente_id)
    .single()

  const etapaAnteriorAnalise = (clienteAntesAnalise?.etapa_atual as string) ?? null

  // Atualiza o cliente: resultado_analise + etapa_atual = ANÁLISE (se ainda não avançou)
  const { error } = await supabase
    .from('clientes')
    .update({
      resultado_analise: input.resultado,
      etapa_atual: 'ANALISE',
    })
    .eq('id', input.cliente_id)
    // Só move para ANÁLISE se ainda estiver nas etapas anteriores
    .in('etapa_atual', ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO'])

  if (error) {
    return { erro: error.message }
  }

  dispatchAutomation('mudanca_etapa', 'cliente', input.cliente_id, {
    etapa_anterior: etapaAnteriorAnalise,
    etapa_nova: 'ANALISE',
    resultado_analise: input.resultado,
  })

  // Registra atividade automática
  const labels: Record<string, string> = {
    RESTRICAO: 'Análise: Restrição',
    CONDICIONADO: 'Análise: Condicionado',
    APROVADO: 'Análise: Aprovado',
    DOC_PENDENTE: 'Análise: Documento Pendente',
  }

  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: labels[input.resultado],
    observacao: input.observacao.trim() || null,
  })

  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function registrarFechamento(input: RegistrarFechamentoInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  // Busca etapa anterior para o dispatch de automação
  const { data: clienteAntesFech } = await supabase
    .from('clientes')
    .select('etapa_atual, nome, vgv, comissao_valor')
    .eq('id', input.cliente_id)
    .single()

  const etapaAnteriorFech = (clienteAntesFech?.etapa_atual as string) ?? null

  // Atualiza ficha_proposta_assinada = true.
  // O trigger cliente_fechamento (before update) do banco intercepta e seta:
  //   etapa_atual = 'FECHAMENTOS'
  //   data_fechamento = now()
  const { error } = await supabase
    .from('clientes')
    .update({ ficha_proposta_assinada: true })
    .eq('id', input.cliente_id)

  if (error) {
    return { erro: error.message }
  }

  dispatchAutomation('mudanca_etapa', 'cliente', input.cliente_id, {
    etapa_anterior: etapaAnteriorFech,
    etapa_nova: 'FECHAMENTOS',
  })

  dispatchAutomation('venda', 'cliente', input.cliente_id, {
    vgv: clienteAntesFech?.vgv ?? null,
    comissao_valor: clienteAntesFech?.comissao_valor,
    nome: clienteAntesFech?.nome,
  })

  // Registra atividade automática
  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Ficha proposta assinada — Fechamento',
    observacao: null,
  })

  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

export async function registrarPosVenda(input: RegistrarPosVendaInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  // Busca etapa anterior para o dispatch de automação
  const { data: clienteAntesPos } = await supabase
    .from('clientes')
    .select('etapa_atual')
    .eq('id', input.cliente_id)
    .single()

  const etapaAnteriorPos = (clienteAntesPos?.etapa_atual as string) ?? null

  // Monta os campos a atualizar
  const updates: Record<string, unknown> = {
    etapa_atual: 'POS_VENDA',
    proxima_acao: input.proxima_acao?.trim() || null,
    proxima_acao_em: input.proxima_acao_em || null,
  }

  // Se informou data de entrega, salva
  if (input.imovel_entregue_em) {
    updates.imovel_entregue_em = new Date(input.imovel_entregue_em).toISOString()
  }

  const { error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', input.cliente_id)
    .in('etapa_atual', ['FECHAMENTOS', 'POS_VENDA'])

  if (error) {
    return { erro: error.message }
  }

  dispatchAutomation('mudanca_etapa', 'cliente', input.cliente_id, {
    etapa_anterior: etapaAnteriorPos,
    etapa_nova: 'POS_VENDA',
  })

  // Registra atividade automática
  const imovelEntregue = input.imovel_entregue_em
    ? `Imóvel entregue em ${new Date(input.imovel_entregue_em).toLocaleDateString('pt-BR')}`
    : 'Imóvel ainda não entregue'

  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Pós-Venda iniciado',
    observacao: `${imovelEntregue}. Próxima ação: ${input.proxima_acao?.trim() || 'aguardando'}`,
  })

  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)

  return { sucesso: true }
}

// === SPRINT 1 — Feature 01: Edição de Cliente ===

export async function editarCliente(input: EditarClienteInput) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

  // Validação completa dos campos
  const erros: string[] = []

  if (!input.nome || input.nome.trim().length < 3) {
    erros.push('O nome deve ter pelo menos 3 caracteres.')
  }

  if (!input.cpf || input.cpf.length !== 11) {
    erros.push('O CPF deve ter exatamente 11 dígitos.')
  }

  if (!input.telefone || (input.telefone.length !== 11 && input.telefone.length !== 10)) {
    erros.push('O telefone deve ter 10 ou 11 dígitos (com DDD).')
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    erros.push('O e-mail informado não é válido.')
  }

  if (input.renda !== null && input.renda < 0) {
    erros.push('A renda não pode ser negativa.')
  }

  if (input.dependentes < 0 || input.dependentes > 20) {
    erros.push('O número de dependentes deve ser entre 0 e 20.')
  }

  if (input.tempo_clt_meses !== null && input.tempo_clt_meses < 0) {
    erros.push('O tempo de CLT não pode ser negativo.')
  }

  if (input.saldo_fgts < 0) {
    erros.push('O saldo FGTS não pode ser negativo.')
  }

  if (erros.length > 0) {
    return { erros }
  }

  // Atualiza o cliente no Supabase
  const { error } = await supabase
    .from('clientes')
    .update({
      nome: input.nome.trim(),
      cpf: input.cpf,
      telefone: input.telefone,
      email: input.email?.trim() || null,
      renda: input.renda,
      dependentes: input.dependentes,
      tempo_clt_meses: input.tempo_clt_meses,
      saldo_fgts: input.saldo_fgts,
      eh_casado: input.eh_casado,
      empreendimento_id: input.empreendimento_id || null,
      observacoes: input.observacoes?.trim() || null,
    })
    .eq('id', input.cliente_id)

  if (error) {
    return { erros: [error.message] }
  }

  dispatchAutomation('cliente_editado', 'cliente', input.cliente_id, {
    nome: input.nome.trim(),
    cpf: input.cpf,
    telefone: input.telefone,
    email: input.email?.trim() || null,
    renda: input.renda,
  })

  // Registra atividade automática de auditoria
  await supabase.from('atividades').insert({
    cliente_id: input.cliente_id,
    usuario_id: user.id,
    tipo: 'WHATSAPP' as const,
    resultado: 'Dados do cliente atualizados',
    observacao: `Campos editados por ${user.email ?? user.id}`,
  })

  // Revalida tanto a ficha individual quanto a listagem
  revalidatePath(`/dashboard/clientes/${input.cliente_id}`)
  revalidatePath('/dashboard/clientes')

  return { sucesso: true }
}

// ═══ Sprint 8: Central do Cliente 360º ═══

export async function cliente360(id: string) {
  await requireAuth()
  const supabase = await createSupabaseServerClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*, usuarios!corretor_responsavel_id(nome), empreendimentos(nome)')
    .eq('id', id)
    .single()

  if (!cliente) return null

  const { data: conjuge } = await supabase.from('conjuges').select('*').eq('cliente_id', id).maybeSingle()

  const [agendamentosIds] = await Promise.all([
    supabase.from('agendamentos').select('id').eq('cliente_id', id),
  ])

  const ids = agendamentosIds.data?.map(a => a.id) ?? []

  const [{ data: atividades }, { data: historico }, { data: docs }, { data: agendamentos }, { data: comparecimentos }] = await Promise.all([
    supabase.from('atividades').select('id, tipo, resultado, created_at, usuarios!inner(nome)').eq('cliente_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('historico_acoes').select('*').eq('entidade_id', id).eq('entidade', 'clientes').order('created_at', { ascending: false }).limit(50),
    supabase.from('documentos').select('*').eq('cliente_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('agendamentos').select('id, data_hora, status, created_at, usuarios!inner(nome)').eq('cliente_id', id).order('data_hora', { ascending: false }),
    supabase.from('comparecimentos').select('id, resultado, agendamento_id, created_at').in('agendamento_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']),
  ])

  const timeline: Cliente360Evento[] = []

  timeline.push({
    data: new Date(cliente.created_at).toISOString().slice(0, 10),
    hora: new Date(cliente.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: 'CADASTRO', usuarioNome: 'Sistema',
    descricao: 'Cliente cadastrado no DNA CRM',
    detalhes: `Etapa inicial: ${cliente.etapa_atual}`,
  })

  for (const a of atividades ?? []) {
    timeline.push({
      data: new Date(a.created_at).toISOString().slice(0, 10),
      hora: new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: a.tipo as Cliente360Evento['tipo'],
      usuarioNome: (a.usuarios as unknown as { nome: string })?.nome ?? '',
      descricao: a.tipo === 'LIGACAO' ? 'Ligação realizada' : a.tipo === 'WHATSAPP' ? 'WhatsApp enviado' : 'Follow-up',
      detalhes: a.resultado,
    })
  }

  for (const h of historico ?? []) {
    if (h.acao === 'MUDANCA_ETAPA') {
      const ant = (h.dados_anteriores as Record<string, unknown>)?.etapa_atual as string ?? ''
      const nova = (h.dados_novos as Record<string, unknown>)?.etapa_atual as string ?? ''
      timeline.push({
        data: new Date(h.created_at).toISOString().slice(0, 10),
        hora: new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'MUDANCA_ETAPA', usuarioNome: '',
        descricao: `Etapa alterada: ${ant} → ${nova}`,
        detalhes: h.observacao,
      })
    }
  }

  for (const d of docs ?? []) {
    timeline.push({
      data: new Date(d.created_at).toISOString().slice(0, 10),
      hora: new Date(d.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'DOCUMENTO', usuarioNome: '',
      descricao: `Documento ${d.tipo} enviado`,
      detalhes: d.status_validacao,
    })
    if (d.status_validacao === 'VALIDADO') {
      timeline.push({
        data: d.data_aprovacao ? new Date(d.data_aprovacao).toISOString().slice(0, 10) : new Date(d.created_at).toISOString().slice(0, 10),
        hora: d.data_aprovacao ? new Date(d.data_aprovacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        tipo: 'DOCUMENTO', usuarioNome: '',
        descricao: `Documento ${d.tipo} aprovado`,
        detalhes: `Versão ${d.versao}`,
      })
    }
  }

  for (const a of agendamentos ?? []) {
    timeline.push({
      data: new Date(a.data_hora).toISOString().slice(0, 10),
      hora: new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'AGENDAMENTO',
      usuarioNome: (a.usuarios as unknown as { nome: string })?.nome ?? '',
      descricao: `Visita ${a.status === 'CONFIRMADO' ? 'confirmada' : a.status === 'CANCELADO' ? 'cancelada' : 'agendada'}`,
      detalhes: a.status,
    })
  }

  for (const c of comparecimentos ?? []) {
    const ag = (agendamentos ?? []).find(a => a.id === c.agendamento_id)
    timeline.push({
      data: new Date(c.created_at).toISOString().slice(0, 10),
      hora: new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'COMPARECIMENTO', usuarioNome: '',
      descricao: c.resultado === 'COMPARECEU' ? 'Cliente compareceu' : 'Cliente NÃO compareceu',
      detalhes: ag ? new Date(ag.data_hora).toLocaleDateString('pt-BR') : null,
    })
  }

  if (cliente.ficha_proposta_assinada) {
    timeline.push({
      data: cliente.data_fechamento ? new Date(cliente.data_fechamento).toISOString().slice(0, 10) : '',
      hora: cliente.data_fechamento ? new Date(cliente.data_fechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      tipo: 'CONTRATO', usuarioNome: '',
      descricao: 'Ficha proposta assinada — fechamento!',
      detalhes: cliente.vgv ? `VGV: R$ ${cliente.vgv.toLocaleString('pt-BR')}` : null,
    })
  }

  timeline.sort((a, b) => new Date(a.data + ' ' + (a.hora || '00:00')).getTime() - new Date(b.data + ' ' + (b.hora || '00:00')).getTime())

  const idxAtual = ETAPA_ORDEM.indexOf(cliente.etapa_atual as EtapaFunil)

  const temposMap: Record<string, number> = {}
  if (Array.isArray(cliente.tempo_etapas)) {
    for (const t of cliente.tempo_etapas as Array<{ etapa: string; data_entrada: string; data_saida: string }>) {
      const horas = Math.round((new Date(t.data_saida).getTime() - new Date(t.data_entrada).getTime()) / 3600000)
      temposMap[t.etapa] = horas
    }
  }
  if (cliente.entrou_etapa_em) {
    temposMap[cliente.etapa_atual] = Math.round((Date.now() - new Date(cliente.entrou_etapa_em).getTime()) / 3600000)
  }

  const pipeline = ETAPA_ORDEM.map((etapa, i) => ({
    etapa, label: ETAPA_LABEL_SINGULAR[etapa],
    status: (i < idxAtual ? 'concluida' : i === idxAtual ? 'atual' : 'pendente') as 'concluida' | 'atual' | 'pendente',
    tempoHoras: temposMap[etapa] ?? null,
  }))

  const obrigatorios = CHECKLIST_OBRIGATORIO[cliente.etapa_atual as EtapaFunil] ?? []
  const aprovadosTipos = new Set((docs ?? []).filter(d => d.status_validacao === 'VALIDADO').map(d => d.tipo))
  const faltantes = obrigatorios.filter(t => !aprovadosTipos.has(t))

  const totalContatos = (atividades ?? []).filter(a => a.tipo === 'LIGACAO' || a.tipo === 'WHATSAPP').length
  const totalAgendamentos = (agendamentos ?? []).length
  const totalComparecimentos = (comparecimentos ?? []).filter(c => c.resultado === 'COMPARECEU').length

  let probabilidade = 5
  if (cliente.etapa_atual === 'FECHAMENTOS') probabilidade += 50
  else if (cliente.etapa_atual === 'APROVADOS') probabilidade += 35
  else if (cliente.etapa_atual === 'CONDICIONADOS') probabilidade += 20
  else if (cliente.etapa_atual === 'ANALISE') probabilidade += 10
  if (faltantes.length === 0 && obrigatorios.length > 0) probabilidade += 15
  if (totalComparecimentos > 0) probabilidade += 10
  if (cliente.ficha_proposta_assinada) probabilidade = 100
  probabilidade = Math.min(100, probabilidade)

  let score = 0
  score += totalContatos * 2
  score += totalAgendamentos * 5
  score += totalComparecimentos * 10
  if (cliente.ficha_proposta_assinada) score += 50
  if (faltantes.length === 0) score += 20
  score += (probabilidade / 100) * 30

  const tempoTotalHoras = Object.values(temposMap).reduce((a, b) => a + b, 0)

  return {
    cliente: cliente as unknown as Cliente, conjuge: conjuge as Conjuge | null,
    corretorNome: (cliente.usuarios as unknown as { nome: string })?.nome ?? '',
    empreendimentoNome: (cliente.empreendimentos as unknown as { nome: string } | null)?.nome ?? null,
    timeline, pipeline,
    agendamentos: (agendamentos ?? []).map(a => ({
      id: a.id, dataHora: a.data_hora, status: a.status,
      comparecimentoResultado: (comparecimentos ?? []).find(c => c.agendamento_id === a.id)?.resultado ?? null,
    })),
    documentos: (docs ?? []) as unknown as Documento[],
    checklist: { obrigatorios, faltantes, completo: faltantes.length === 0 },
    financeiro: {
      vgv: cliente.vgv, comissaoValor: cliente.comissao_valor, comissaoPercentual: cliente.comissao_percentual,
      renda: cliente.renda, saldoFgts: cliente.saldo_fgts,
      entradaEstimada: cliente.saldo_fgts > 0 ? cliente.saldo_fgts : null,
      financiamentoEstimado: cliente.vgv ? cliente.vgv - (cliente.saldo_fgts || 0) : null,
      parcelasEstimadas: cliente.vgv && cliente.renda ? Math.round((cliente.vgv - (cliente.saldo_fgts || 0)) / (cliente.renda * 0.3 * 12)) : null,
      subsídio: null,
    },
    analiseFinanceira: {
      renda: cliente.renda, dependentes: cliente.dependentes, tempoCltMeses: cliente.tempo_clt_meses,
      restricoes: cliente.resultado_analise === 'RESTRICAO' ? 'Restrições encontradas' : null,
      resultado: cliente.resultado_analise,
    },
    painelGerencial: {
      tempoTotalFunilHoras: tempoTotalHoras,
      tempoPorEtapa: Object.entries(temposMap).map(([etapa, horas]) => ({ etapa, horas })),
      totalContatos, totalAgendamentos, totalComparecimentos,
      docsPendentes: (docs ?? []).filter(d => d.status_validacao !== 'VALIDADO').length,
      probabilidadeFechamento: probabilidade,
      scoreCliente: Math.round(score),
    },
    diasSemContato: Math.floor((Date.now() - new Date(cliente.ultima_atividade_em).getTime()) / 86400000),
    diasNaEtapa: cliente.entrou_etapa_em ? Math.floor((Date.now() - new Date(cliente.entrou_etapa_em).getTime()) / 86400000) : 0,
  }
}