// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// Client Page: gerencia estado do copiloto, orquestra as 5 seções.
// Recebe dados iniciais do servidor.

'use client'

import { useState, useCallback } from 'react'
import type {
  CopilotResumoInteligente,
  CopilotRecomendacao,
  CopilotPergunta,
  CopilotComando,
  CopilotInsight,
} from '@/src/types/copiloto'
import { COPILOT_PERGUNTAS_SUGERIDAS, COPILOT_COMANDOS_BASICOS } from '@/src/types/copiloto'
import {
  CopilotResumo,
  CopilotRecomendacoes,
  CopilotPerguntas,
  CopilotoComandos,
  CopilotoInsights,
} from '@/src/components/copiloto'

interface CopilotoClientProps {
  usuarioId: string
  usuarioNome: string
  resumoInicial: CopilotResumoInteligente
  recomendacoesIniciais: CopilotRecomendacao[]
}

export default function CopilotoClientPage({
  usuarioId,
  usuarioNome: _usuarioNome,
  resumoInicial,
  recomendacoesIniciais,
}: CopilotoClientProps) {
  const [resumo] = useState(resumoInicial)
  const [recomendacoes] = useState(recomendacoesIniciais)
  const [historicoPerguntas, setHistoricoPerguntas] = useState<CopilotPergunta[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'RESUMO' | 'PERGUNTAS' | 'INSIGHTS'>('RESUMO')

  // ── Pseudo-insights para exibição (calculados do contexto) ─────────
  const insights: CopilotInsight[] = []

  // ── Perguntar ──────────────────────────────────────────────────
  const handlePerguntar = useCallback(async (pergunta: string): Promise<string> => {
    // Mock: resposta local. Em FASE 2, chama /api/copiloto/perguntar
    const resposta = `Você perguntou "${pergunta}". 
Consulte as telas do CRM para dados detalhados. 
Para Follow-ups: /dashboard/followup. 
Para Pipeline: /dashboard/funil. 
Para Documentos: /dashboard/documentos.`

    const newP: CopilotPergunta = {
      id: `hist-${Date.now()}`,
      usuarioId,
      pergunta,
      resposta,
      dadosContexto: null,
      util: null,
      created_at: new Date().toISOString(),
    }

    setHistoricoPerguntas(prev => [newP, ...prev].slice(0, 50))
    return resposta
  }, [usuarioId])

  // ── Comandos ────────────────────────────────────────────────────────
  const comandos: CopilotComando[] = COPILOT_COMANDOS_BASICOS.map((c, i) => ({
    ...c,
    id: `cmd-${i}`,
  }))

  const handleExecutarComando = useCallback((comando: CopilotComando) => {
    switch (comando.acao) {
      case 'CRIAR_AGENDAMENTO':
        window.location.href = '/dashboard/agenda'
        break
      case 'ABRIR_FICHA':
        window.location.href = '/dashboard/clientes'
        break
      case 'ABRIR_WHATSAPP':
        window.location.href = '/dashboard/whatsapp'
        break
      case 'MOVER_CLIENTE':
        window.location.href = '/dashboard/funil'
        break
      case 'CRIAR_ATIVIDADE':
        window.location.href = '/dashboard/clientes'
        break
      case 'ABRIR_FINANCIAMENTO':
        window.location.href = '/dashboard/financeiro'
        break
    }
  }, [])

  // ── Abas ─────────────────────────────────────────────────────────────────
  const abas = [
    { id: 'RESUMO', label: 'Resumo', icon: '📊' },
    { id: 'PERGUNTAS', label: 'Perguntas', icon: '❓' },
    { id: 'INSIGHTS', label: 'Insights', icon: '🔍' },
  ] as const

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Copiloto IA</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Assistente Comercial Inteligente — baseado exclusivamente nos dados do seu CRM.
        </p>
      </header>

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAbaAtiva(a.id)}
            className={`px-4 py-2 text-sm font-medium transition ${ abaAtiva === a.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700' }`}
          >
            <span className="mr-1">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'RESUMO' && <CopilotResumo resumo={resumo} />}
      {abaAtiva === 'PERGUNTAS' && (
        <CopilotPerguntas
          perguntasSugeridas={COPILOT_PERGUNTAS_SUGERIDAS}
          onPerguntar={handlePerguntar}
          historico={historicoPerguntas}
        />
      )}
      {abaAtiva === 'INSIGHTS' && <CopilotoInsights insights={insights} />}

      {/* Recomendações (fixo embaixo) */}
      <CopilotRecomendacoes recomendacoes={recomendacoes} />

      {/* Comandos (fixo embaixo) */}
      <CopilotoComandos comandos={comandos} onExecutar={handleExecutarComando} />

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 pb-6">
        Copiloto IA DNA Imóveis v1.0 · Dados sempre atualizados · Nenhuma informação é inventada.
      </p>
    </div>
  )
}