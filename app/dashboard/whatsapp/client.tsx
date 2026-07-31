// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Client Page: componente principal que gerencia estado e orquestra os 8 componentes.
// Recebe dados iniciais do servidor e gerencia atualizações em tempo real.

'use client'

import { useState, useCallback } from 'react'
import type {
  WhatsAppConversaEnriquecida,
  WhatsAppMensagem,
  WhatsAppTemplate,
  WhatsAppMetricas,
} from '@/src/types/whatsapp'
import {
  CaixaEntrada,
  ChatPanel,
  PainelCliente,
  GerenciadorTemplates,
  WidgetMetricas,
  CentroComandoWhatsApp,
} from '@/src/components/whatsapp'

interface WhatsAppClientPageProps {
  usuarioId: string
  usuarioNome: string
  usuarioPerfil: string
  conversasIniciais: WhatsAppConversaEnriquecida[]
  metricasIniciais: WhatsAppMetricas
}

type Aba = 'CLIENTE' | 'TEMPLATES' | 'METRICAS' | 'CENTRO_COMANDO'
type WhatsAppConversaStatusEnum = 'aberta' | 'finalizada' | 'arquivada'

export default function WhatsAppClientPage({
  usuarioId,
  usuarioNome,
  conversasIniciais,
  metricasIniciais,
}: WhatsAppClientPageProps) {
  const [conversas] = useState<WhatsAppConversaEnriquecida[]>(conversasIniciais)
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<WhatsAppConversaStatusEnum | 'todas'>('todas')
  const [mensagens, setMensagens] = useState<WhatsAppMensagem[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('CLIENTE')

  const conversaAtiva = conversas.find(c => c.conversa.id === conversaAtivaId) ?? null

  // ─── Handlers ──────────────────────────────────────────────────────────────────

  const handleSelecionarConversa = useCallback(async (id: string) => {
    setConversaAtivaId(id)
    // Aqui podemos carregar mensagens; por enquanto carrega local mock
    setMensagens([])
  }, [])

  const handleEnviarMensagem = useCallback((texto: string) => {
    if (!conversaAtiva) return
    const novaMsg: WhatsAppMensagem = {
      id: `local-${Date.now()}`,
      conversa_id: conversaAtiva.conversa.id,
      remetente: 'usuario',
      texto,
      tipo: 'texto',
      media_url: null,
      media_type: null,
      template_id: null,
      template_dados: null,
      lida: true,
      enviada_em: new Date().toISOString(),
      entregue_em: null,
      lida_em: null,
    }
    setMensagens(prev => [...prev, novaMsg])
  }, [conversaAtiva])

  const handleMarcarLidas = useCallback((ids: string[]) => {
    setMensagens(prev => prev.map(m => ids.includes(m.id) ? { ...m, lida: true } : m))
  }, [])

  const handleFiltrar = useCallback((filtro: WhatsAppConversaStatusEnum | 'todas') => {
    setFiltroStatus(filtro)
  }, [])

  const handleFiltrarNaoLidas = useCallback(() => {
    setConversaAtivaId(null)
  }, [])

  const handleCriarTemplate = useCallback((t: Omit<WhatsAppTemplate, 'id' | 'criado_por' | 'created_at' | 'updated_at'>) => {
    const novo: WhatsAppTemplate = {
      ...t,
      id: `tmp-${Date.now()}`,
      criado_por: usuarioId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTemplates(prev => [...prev, novo])
  }, [usuarioId])

  const handleSelecionarTemplate = useCallback((t: WhatsAppTemplate) => {
    setSelectedTemplateId(t.id)
  }, [])

  const handleExcluirTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedTemplateId === id) setSelectedTemplateId(null)
  }, [selectedTemplateId])

  const handleNovaConversa = useCallback(() => {
    // TODO: criar conversa e selecionar
  }, [])

  // ── Tabs da Sidebar ──────────────────────────────────────────────────────────

  const tabs: { id: Aba; label: string; icon: string }[] = [
    { id: 'CLIENTE', label: 'Cliente', icon: '👤' },
    { id: 'TEMPLATES', label: 'Templates', icon: '📋' },
    { id: 'METRICAS', label: 'Métricas', icon: '📊' },
    { id: 'CENTRO_COMANDO', label: 'Comando', icon: '⚡' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-12 h-full">
      {/* Caixa de Entrada */}
      <CaixaEntrada
        conversas={conversas}
        conversaAtivaId={conversaAtivaId}
        onSelecionar={handleSelecionarConversa}
        onFiltrar={handleFiltrar}
        filtroAtual={filtroStatus}
      />

      {/* Chat Principal */}
      <ChatPanel
        conversa={conversaAtiva}
        mensagens={mensagens}
        usuarioName={usuarioNome}
        onEnviar={handleEnviarMensagem}
        onMarcaLidas={handleMarcarLidas}
      />

      {/* Sidebar Direita — Abas */}
      <div className="col-span-3 flex flex-col border-l">
        {/* Mini-navegação de abas */}
        <div className="flex border-b">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setAbaAtiva(t.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                abaAtiva === t.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="block text-center">{t.icon}</span>
              <span className="block text-center text-[10px] mt-0.5">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo da aba ativa */}
        <div className="flex-1 overflow-y-auto">
          {abaAtiva === 'CLIENTE' && (
            <PainelCliente conversa={conversaAtiva} />
          )}
          {abaAtiva === 'TEMPLATES' && (
            <GerenciadorTemplates
              templates={templates}
              onCriar={handleCriarTemplate}
              onSelecionar={handleSelecionarTemplate}
              onExcluir={handleExcluirTemplate}
              selecionadoId={selectedTemplateId}
            />
          )}
          {abaAtiva === 'METRICAS' && (
            <WidgetMetricas metricas={metricasIniciais} />
          )}
          {abaAtiva === 'CENTRO_COMANDO' && (
            <CentroComandoWhatsApp
              metricas={metricasIniciais}
              onFiltrarNaoLidas={handleFiltrarNaoLidas}
              onNovaConversa={handleNovaConversa}
            />
          )}
        </div>
      </div>
    </div>
  )
}