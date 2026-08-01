// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Gerenciador de Templates: CRUD local de templates de mensagem pré-definidos.
// FASE 1: armazenamento local (Zustand ou state). FASE 2: DB + API.

'use client'

import { useState } from 'react'
import type { WhatsAppTemplate, WhatsAppTemplateCategoria } from '@/src/types/whatsapp'

interface TemplatesProps {
  templates: WhatsAppTemplate[]
  onCriar: (template: Omit<WhatsAppTemplate, 'id' | 'criado_por' | 'created_at' | 'updated_at'>) => void
  onSelecionar: (template: WhatsAppTemplate) => void
  onExcluir: (id: string) => void
  selecionadoId: string | null
}

const CATEGORIAS: { label: string; value: WhatsAppTemplateCategoria }[] = [
  { label: 'Boas-vindas', value: 'boas_vindas' },
  { label: 'Lembrete', value: 'lembrete' },
  { label: 'Follow-up', value: 'follow_up' },
  { label: 'Pós-venda', value: 'pos_venda' },
  { label: 'Genérico', value: 'generico' },
]

export function GerenciadorTemplates({ templates, onCriar, onSelecionar, onExcluir, selecionadoId }: TemplatesProps) {
  const [mostrandoForm, setMostrandoForm] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState<WhatsAppTemplateCategoria>('generico')
  const [novoNome, setNovoNome] = useState('')
  const [novoCorpo, setNovoCorpo] = useState('')

  const handleCriar = () => {
    if (!novoNome.trim() || !novoCorpo.trim()) return
    // Extrai variáveis: ex: {nome}, {data}
    const variaveis = (novoCorpo.match(/\{(\w+)\}/g) ?? []).map(v => v)
    onCriar({
      nome: novoNome.trim(),
      categoria: novaCategoria,
      corpo: novoCorpo.trim(),
      variaveis,
      ativo: true,
    })
    setNovoNome('')
    setNovoCorpo('')
    setMostrandoForm(false)
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Templates</h3>
        <button
          onClick={() => setMostrandoForm(!mostrandoForm)}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          {mostrandoForm ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {/* Formulário de criação */}
      {mostrandoForm && (
        <div className="border-b bg-gray-50 dark:bg-gray-700 p-4 space-y-3">
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome do template"
            className="w-full rounded border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm"
          />
          <select
            value={novaCategoria}
            onChange={e => setNovaCategoria(e.target.value as WhatsAppTemplateCategoria)}
            className="w-full rounded border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm"
          >
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <textarea
            value={novoCorpo}
            onChange={e => setNovoCorpo(e.target.value)}
            placeholder="Corpo do template. Use {campos} para variáveis."
            rows={4}
            className="w-full rounded border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleCriar}
            disabled={!novoNome.trim() || !novoCorpo.trim()}
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Salvar Template
          </button>
        </div>
      )}

      {/* Lista de templates */}
      <div className="flex-1 overflow-y-auto">
        {templates.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Nenhum template criado. Crie o primeiro!
          </p>
        ) : (
          templates.map(t => (
            <div
              key={t.id}
              onClick={() => onSelecionar(t)}
              className={`cursor-pointer border-b px-4 py-3 transition-colors hover:bg-blue-50 ${ selecionadoId === t.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : '' }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.nome}</span>
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {t.categoria}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t.corpo}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  {t.variaveis.map(v => (
                    <span key={v} className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                      {v}
                    </span>
                  ))}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onExcluir(t.id) }}
                  className="text-[10px] text-red-500 hover:text-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}