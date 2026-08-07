// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Camada de serviço: adapter pattern para provedores WhatsApp.
// FASE 1: apenas mock (operações locais no banco, sem API externa).
// FASE 2: adapters reais para Evolution API, Meta Cloud API, Z-API, Green API.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type {
  WhatsAppProvedorConfig,
  WhatsAppSendPayload,
  WhatsAppSendResult,
  WhatsAppAdapter,
  WhatsAppMensagem,
  WhatsAppConversa,
  WhatsAppConversaEnriquecida,
  WhatsAppMetricas,
  WhatsAppFiltros,
} from '@/src/types/whatsapp'

// ─── Factory ───────────────────────────────────────────────────────────────────

export function criarWhatsAppAdapter(config: WhatsAppProvedorConfig): WhatsAppAdapter {
  switch (config.tipo) {
    case 'mock':
      return criarMockAdapter()
    case 'evolution':
    case 'meta':
    case 'zapi':
    case 'green':
      throw new Error(`Provedor "${config.tipo}" ainda não implementado (FASE 2)`)
    default:
      throw new Error(`Provedor desconhecido: ${config.tipo}`)
  }
}

// ─── Mock Adapter ──────────────────────────────────────────────────────────────

function criarMockAdapter(): WhatsAppAdapter {
  return {
    config: { tipo: 'mock', baseUrl: 'mock://', apiKey: 'mock-key' },

    async enviar(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult> {
      const messageId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('[WhatsApp Mock] Enviando mensagem para', payload.telefone)
      }
      return { ok: true, messageId }
    },

    async status(_messageId: string): Promise<{ status: string; error?: string }> {
      return { status: 'ENTREGUE' }
    },
  }
}

// ─── Conversas ─────────────────────────────────────────────────────────────────

export async function listarConversas(
  usuarioId: string,
  filtros: WhatsAppFiltros,
): Promise<WhatsAppConversaEnriquecida[]> {
  const supabase = await createSupabaseServerClient()

  let query = supabase.from('whatsapp_conversas').select('*')

  if (filtros.status !== 'todas') query = query.eq('status', filtros.status)
  if (filtros.corretorId) query = query.eq('usuario_id', filtros.corretorId)
  if (filtros.busca) {
    query = query.or(
      `telefone_cliente.ilike.%${filtros.busca}%`
    )
  }

  const { data: conversas, error } = await query
    .order('ultima_mensagem_em', { ascending: false })
    .limit(200)

  if (error || !conversas) return []

  // Buscar dados dos clientes, não lidas, e última mensagem
  const ids = conversas.map(c => c.id)
  const clienteIds = conversas.map(c => c.cliente_id as string).filter(Boolean)

  const [
    { data: clientes },
    { data: naoLidas },
    { data: ultimas },
  ] = await Promise.all([
    clienteIds.length > 0
      ? supabase.from('clientes').select('id, nome, telefone, etapa_atual').in('id', clienteIds)
      : Promise.resolve({ data: [] }),
    supabase.from('whatsapp_mensagens')
      .select('conversa_id')
      .in('conversa_id', ids)
      .eq('remetente', 'cliente')
      .eq('lida', false),
    supabase.from('whatsapp_mensagens')
      .select('*')
      .in('conversa_id', ids)
      .order('enviada_em', { ascending: false }),
  ])

  // Maps
  const clienteMap: Record<string, { id: string; nome: string; telefone: string; etapa_atual: string }> = {}
  for (const c of clientes ?? []) clienteMap[c.id] = c

  const naoLidasMap: Record<string, number> = {}
  for (const m of naoLidas ?? []) {
    naoLidasMap[m.conversa_id] = (naoLidasMap[m.conversa_id] ?? 0) + 1
  }

  const ultimaMap: Record<string, WhatsAppMensagem> = {}
  const seen = new Set<string>()
  for (const m of ultimas ?? []) {
    if (!seen.has(m.conversa_id)) {
      ultimaMap[m.conversa_id] = m as WhatsAppMensagem
      seen.add(m.conversa_id)
    }
  }

  // Buscar nomes de corretores
  const corretorIds = [...new Set(conversas.map(c => c.usuario_id))]
  const { data: usuarios } = corretorIds.length > 0
    ? await supabase.from('usuarios').select('id, nome').in('id', corretorIds)
    : { data: [] }
  const nomeMap: Record<string, string> = {}
  for (const u of usuarios ?? []) nomeMap[u.id] = u.nome

  // Monta objetos enriquecidos
  let resultado: WhatsAppConversaEnriquecida[] = conversas.map(c => {
    const cli = clienteMap[c.cliente_id as string]
    return {
      conversa: c as unknown as WhatsAppConversa,
      cliente: {
        id: cli?.id ?? '',
        nome: cli?.nome ?? 'Cliente Desconhecido',
        telefone: cli?.telefone ?? c.telefone_cliente ?? '',
        etapa_atual: cli?.etapa_atual ?? 'NOVO_LEAD',
        corretor_nome: nomeMap[c.usuario_id] ?? '',
      },
      naoLidas: naoLidasMap[c.id] ?? 0,
      ultimaMensagem: ultimaMap[c.id] ?? null,
    }
  })

  // Filtro de não lidas
  if (filtros.temNaoLidas) {
    resultado = resultado.filter(r => r.naoLidas > 0)
  }

  return resultado
}

export async function buscarConversa(conversaId: string): Promise<WhatsAppConversa | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('id', conversaId)
    .single()
  return data as WhatsAppConversa | null
}

export async function criarConversa(
  clienteId: string,
  usuarioId: string,
  telefone: string,
): Promise<WhatsAppConversa> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('whatsapp_conversas')
    .insert({
      cliente_id: clienteId,
      usuario_id: usuarioId,
      telefone_cliente: telefone,
      provedor: 'mock',
      status: 'aberta',
    })
    .select('*')
    .single()
  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`)
  return data as WhatsAppConversa
}

// ─── Mensagens ─────────────────────────────────────────────────────────────────

export async function listarMensagens(
  conversaId: string,
  limit = 50,
): Promise<WhatsAppMensagem[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('whatsapp_mensagens')
    .select('*')
    .eq('conversa_id', conversaId)
    .order('enviada_em', { ascending: false })
    .limit(limit)
  return (data ?? []) as WhatsAppMensagem[]
}

export async function enviarMensagem(
  conversaId: string,
  texto: string,
  remetente: 'usuario' | 'cliente' | 'sistema' = 'usuario',
  tipo: string = 'texto',
): Promise<WhatsAppMensagem> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversaId,
      remetente,
      texto,
      tipo,
      enviada_em: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new Error(`Erro ao enviar mensagem: ${error.message}`)
  return data as WhatsAppMensagem
}

export async function marcarLidas(mensagemIds: string[]): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('whatsapp_mensagens')
    .update({ lida: true, lida_em: new Date().toISOString() })
    .in('id', mensagemIds)
}

export async function marcarConversaLida(conversaId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('whatsapp_mensagens')
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq('conversa_id', conversaId)
    .eq('remetente', 'cliente')
    .eq('lida', false)
}

// ─── Métricas ───────────────────────────────────────────────────────────────────

export async function getMetricas(usuarioId: string): Promise<WhatsAppMetricas> {
  const supabase = await createSupabaseServerClient()
  const hoje = new Date().toISOString().slice(0, 10)

  // IDs de conversas do usuário
  const { data: convs } = await supabase
    .from('whatsapp_conversas')
    .select('id, status')
    .eq('usuario_id', usuarioId)

  const conversaIds = convs?.map(c => c.id) ?? []

  const [_, { data: msgsHoje }] = await Promise.all([
    supabase.from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('status', 'aberta'),
    conversaIds.length > 0
      ? supabase.from('whatsapp_mensagens')
          .select('remetente')
          .in('conversa_id', conversaIds)
          .gte('enviada_em', hoje + 'T00:00:00')
      : Promise.resolve({ data: [] }),
  ])

  const enviados = (msgsHoje ?? []).filter(m => m.remetente === 'usuario').length
  const recebidos = (msgsHoje ?? []).filter(m => m.remetente === 'cliente').length

  const aberta = convs?.filter(c => c.status === 'aberta').length ?? 0
  const finalizada = convs?.filter(c => c.status === 'finalizada').length ?? 0
  const arquivada = convs?.filter(c => c.status === 'arquivada').length ?? 0

  // Conversas criadas hoje
  const { count: convsHoje } = await supabase
    .from('whatsapp_conversas')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .gte('created_at', hoje + 'T00:00:00')

  return {
    conversasAbertas: aberta,
    conversasHoje: convsHoje ?? 0,
    mensagensEnviadasHoje: enviados,
    mensagensRecebidasHoje: recebidos,
    tempoMedioRespostaMinutos: 0, // FASE 2: calcular com dados reais
    templatesMaisUsados: [], // FASE 2
    conversasPorStatus: { aberta, finalizada, arquivada },
  }
}

// ─── Serviço Consolidado ───────────────────────────────────────────────────────

export const whatsappService = {
  criarAdapter: criarWhatsAppAdapter,
  listarConversas,
  buscarConversa,
  criarConversa,
  listarMensagens,
  enviarMensagem,
  marcarLidas,
  marcarConversaLida,
  getMetricas,
} as const