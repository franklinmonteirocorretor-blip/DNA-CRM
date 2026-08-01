'use client'

import { useState } from 'react'
import { criarAutomacao } from '@/app/dashboard/automacoes/actions'
import type { AutomationEvent, AutomationCondition, AutomationActionSpec } from '@/src/lib/automation/types'

const EVENTOS: { label: string; value: AutomationEvent }[] = [
  { label: 'Cliente criado', value: 'cliente_criado' },
  { label: 'Cliente editado', value: 'cliente_editado' },
  { label: 'Mudança de etapa', value: 'mudanca_etapa' },
  { label: 'Novo documento', value: 'novo_documento' },
  { label: 'Documento aprovado', value: 'documento_aprovado' },
  { label: 'Documento rejeitado', value: 'documento_rejeitado' },
  { label: 'Agendamento criado', value: 'agendamento_criado' },
  { label: 'Agendamento confirmado', value: 'agendamento_confirmado' },
  { label: 'Comparecimento', value: 'comparecimento' },
  { label: 'Venda', value: 'venda' },
]

const ACOES: { text: string; val: AutomationActionSpec['acao'] }[] = [
  { text: 'Criar tarefa', val: 'criar_tarefa' },
  { text: 'Criar alerta', val: 'criar_alerta' },
  { text: 'Atualizar proxima acao', val: 'atualizar_proxima_acao' },
  { text: 'Atualizar prioridade', val: 'atualizar_prioridade' },
  { text: 'Atualizar score', val: 'atualizar_score' },
  { text: 'Registrar auditoria', val: 'registrar_auditoria' },
]

export default function FormAutomacao({ onClose }: { onClose: () => void }) {
  const [nome, setNome] = useState('')
  const [desc, setDesc] = useState('')
  const [evento, setEvento] = useState<AutomationEvent>('cliente_criado')
  const [status, setStatus] = useState<'ATIVA' | 'INATIVA'>('INATIVA')
  const [conds, setConds] = useState<AutomationCondition[]>([])
  const [acts, setActs] = useState<AutomationActionSpec[]>([])
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)

  const [cTipo, setCTipo] = useState('etapa')
  const [cOp, setCOp] = useState('igual')
  const [cVal, setCVal] = useState('')
  const [aAct, setAAct] = useState<AutomationActionSpec['acao']>('criar_tarefa')

  const addCond = () => {
    if (!cVal.trim()) return
    setConds([...conds, { tipo: cTipo as AutomationCondition['tipo'], operador: cOp as AutomationCondition['operador'], valor: cVal }])
    setCVal('')
  }

  const addAct = () => {
    setActs([...acts, { acao: aAct, params: {} }])
  }

  const submit = async () => {
    if (!nome.trim()) { setErro('Nome obrigatorio'); return }
    setSaving(true)
    setErro('')
    const r = await criarAutomacao({ nome, descricao: desc, evento, condicoes: conds, acoes: acts, status, prioridade: 1 })
    setSaving(false)
    if (r.sucesso) onClose()
    else setErro(r.erro ?? 'Erro ao salvar')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold mb-4">Nova Automacao</h2>
        {erro && <p className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded">{erro}</p>}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
        <input className="w-full border rounded-md px-3 py-2 text-sm mb-3" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Alerta de inatividade 7 dias" />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descricao</label>
        <input className="w-full border rounded-md px-3 py-2 text-sm mb-3" value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que esta automacao faz?" />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evento disparador</label>
        <select className="w-full border rounded-md px-3 py-2 text-sm mb-3" value={evento} onChange={e => setEvento(e.target.value as AutomationEvent)}>
          {EVENTOS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
        </select>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status inicial</label>
        <select className="w-full border rounded-md px-3 py-2 text-sm mb-3" value={status} onChange={e => setStatus(e.target.value as 'ATIVA' | 'INATIVA')}>
          <option value="ATIVA">ATIVA</option>
          <option value="INATIVA">INATIVA</option>
        </select>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Condicoes</h3>
          <div className="flex gap-2 mb-2">
            <select className="border rounded-md px-2 py-1.5 text-sm" value={cTipo} onChange={e => setCTipo(e.target.value)}>
              <option value="etapa">Etapa</option>
              <option value="status">Status</option>
              <option value="tempo_parado">Tempo parado</option>
            </select>
            <select className="border rounded-md px-2 py-1.5 text-sm" value={cOp} onChange={e => setCOp(e.target.value)}>
              <option value="igual">Igual</option>
              <option value="maior">Maior que</option>
              <option value="menor">Menor que</option>
            </select>
            <input className="border rounded-md px-2 py-1.5 text-sm w-40" placeholder="Valor" value={cVal} onChange={e => setCVal(e.target.value)} />
            <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm" onClick={addCond}>+</button>
          </div>
          {conds.map((c, i) => (
            <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 border rounded px-2 py-1 mb-1 flex justify-between items-center">
              <span>{c.tipo} {c.operador} {String(c.valor)}</span>
              <button type="button" className="text-red-400 hover:text-red-600 text-lg px-1" onClick={() => setConds(conds.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Acoes</h3>
          <div className="flex gap-2">
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={aAct} onChange={e => setAAct(e.target.value as AutomationActionSpec['acao'])}>
              {ACOES.map(a => <option key={a.val} value={a.val}>{a.text}</option>)}
            </select>
            <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm" onClick={addAct}>+</button>
          </div>
          {acts.map((a, i) => (
            <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 border rounded px-2 py-1 mb-1 flex justify-between mt-1 items-center">
              <span>{a.acao}</span>
              <button type="button" className="text-red-400 hover:text-red-600 text-lg px-1" onClick={() => setActs(acts.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button type="button" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border rounded-md" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md" onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Automacao'}
          </button>
        </div>
      </div>
    </div>
  )
}