'use client'

// DNA CRM — RC1: Lazy load de componentes pesados
// Reduz JS bundle inicial; cada componente só carrega quando necessário.

import dynamic from 'next/dynamic'

// ─── Pipeline Board (Kanban com drag-and-drop) ────────────────────────────────
export const LazyPipelineBoard = dynamic(
  () => import('@/src/components/pipeline/PipelineBoard'),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[300px] text-gray-400">Carregando pipeline...</div> },
)

// ─── Calendário da Agenda (grid 42 células + overlays) ────────────────────────
export const LazyCalendarioAgenda = dynamic(
  () => import('@/src/components/agenda/CalendarioAgenda'),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[400px] text-gray-400">Carregando calendário...</div> },
)

// ─── Rankings (tabelas pesadas, múltiplas seções) ─────────────────────────────
export const LazyRanking = dynamic(
  () => import('@/src/components/gestao/Ranking'),
  { loading: () => <div className="flex items-center justify-center h-[200px] text-gray-400">Carregando ranking...</div> },
)

// ─── Produtivity Charts (gráficos de barra) ───────────────────────────────────
export const LazyProdutividade = dynamic(
  () => import('@/src/components/gestao/Produtividade'),
  { loading: () => <div className="flex items-center justify-center h-[200px] text-gray-400">Carregando produtividade...</div> },
)