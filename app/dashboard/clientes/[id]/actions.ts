'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'

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
  tipo: 'RG' | 'CPF' | 'CNH' | 'COMPROVANTE_RENDA' | 'FGTS' | 'CONTRATO' | 'PROPOSTA_PDF' | 'OUTRO'
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

  const { error } = await supabase.from('agendamentos').insert({
    cliente_id: input.cliente_id,
    corretor_id: user.id,
    data_hora: data.toISOString(),
    empreendimento_id: input.empreendimento_id || null,
    status: 'AGENDADO',
  })

  if (error) {
    return { erro: error.message }
  }

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
  const { error: insertError } = await supabase.from('documentos').insert({
    cliente_id: input.cliente_id,
    tipo: input.tipo,
    arquivo_url: arquivoUrl,
    status_validacao: 'PENDENTE',
    enviado_por: user.id,
  })

  if (insertError) {
    return { erro: insertError.message }
  }

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
  const { error } = await supabase.from('comparecimentos').insert({
    agendamento_id: input.agendamento_id,
    resultado: input.resultado,
    motivo_ausencia: input.resultado === 'NAO_COMPARECEU' ? (input.motivo_ausencia?.trim() || null) : null,
    observacao: input.observacao.trim() || null,
  })

  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return { erro: 'Este agendamento já tem comparecimento registrado.' }
    }
    return { erro: error.message }
  }

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
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

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
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa estar logado.' }
  }

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