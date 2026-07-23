'use client'

import { useState, useEffect } from 'react'
import { buscarClienteDetalhe, moverEtapa } from '@/app/dashboard/funil/actions'
import { verificarChecklist } from '@/app/dashboard/documentos/actions'
import { PipelineClienteDetalhe, EtapaFunil, CHECKLIST_OBRIGATORIO } from '@/src/types'
import Link from 'next/link'

const ETAPA_LABELS: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'Novo Contato',
  CONTATOS: 'Contato Realizado',
  AGENDAMENTO: 'Visita Agendada',
  COMPARECIMENTO: 'Visita',
  ANALISE: 'Análise',
  RESTRICOES: 'Restrições',
  CONDICIONADOS: 'Condicionado',
  APROVADOS: 'Aprovado',
  FECHAMENTOS: 'Documentação/Contrato',
  POS_VENDA: 'Pós-venda',
}

const PROXIMAS_ETAPAS: Record<EtapaFunil, EtapaFunil[]> = {
  NOVO_LEAD: ['CONTATOS'],
  CONTATOS: ['AGENDAMENTO'],
  AGENDAMENTO: ['COMPARECIMENTO'],
  COMPARECIMENTO: ['ANALISE'],
  ANALISE: ['RESTRICOES', 'CONDICIONADOS', 'APROVADOS'],
  RESTRICOES: ['CONTATOS', 'ANALISE'],
  CONDICIONADOS: ['APROVADOS', 'RESTRICOES'],
  APROVADOS: ['AGENDAMENTO', 'FECHAMENTOS'],
  FECHAMENTOS: ['POS_VENDA'],
  POS_VENDA: [],
}

export default function PainelClientePipeline({
  clienteId,
  onFechar,
  onAtualizado,
}: {
  clienteId: string
  onFechar: () => void
  onAtualizado: () => void
}) {
  const [dados, setDados] = useState<PipelineClienteDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarClienteDetalhe(clienteId).then((d) => {
      setDados(d)
      setCarregando(false)
    })
  }, [clienteId])

  const [mensagemBloqueio, setMensagemBloqueio] = useState<string | null>(null)

  async function avancarEtapa(novaEtapa: EtapaFunil) {
    // Sprint 7: verifica checklist obrigatório antes de avançar para etapas que exigem docs
    const obrigatorios = CHECKLIST_OBRIGATORIO[novaEtapa]
    if (obrigatorios && obrigatorios.length > 0) {
      const check = await verificarChecklist(clienteId, novaEtapa)
      if (!check.completo) {
        setMensagemBloqueio(`Checklist incompleto. Faltam: ${check.faltantes.join(', ')}`)
        return
      }
    }
    setMensagemBloqueio(null)
    const r = await moverEtapa(clienteId, novaEtapa)
    if (r.success) onAtualizado()
  }

  if (carregando) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 p-6">
        <p className="text-sm text-gray-400 animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 p-6">
        <p className="text-sm text-red-500">Cliente não encontrado.</p>
        <button onClick={onFechar} className="mt-4 text-xs text-blue-600">Fechar</button>
      </div>
    )
  }

  const proximas = PROXIMAS_ETAPAS[dados.etapaAtual] ?? []

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onFechar} />

      {/* Painel */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{dados.nome}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {/* Contato rápido */}
          <div className="flex gap-2">
            <a
              href={`https://wa.me/55${dados.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white text-center hover:bg-emerald-700"
            >
              WhatsApp
            </a>
            <a
              href={`tel:${dados.telefone}`}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white text-center hover:bg-blue-700"
            >
              Ligar
            </a>
            <Link
              href={`/dashboard/clientes/${dados.id}`}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 text-center hover:bg-gray-50"
            >
              Abrir
            </Link>
          </div>

          {/* Informações */}
          <div className="space-y-1.5 text-xs">
            <Info linha="📱 Telefone" valor={dados.telefone} />
            {dados.email && <Info linha="📧 E-mail" valor={dados.email} />}
            <Info linha="🏢 Empreendimento" valor={dados.empreendimentoNome ?? dados.empreendimentoInteresse ?? '—'} />
            <Info linha="👤 Corretor" valor={dados.corretorNome} />
            <Info linha="📊 Etapa atual" valor={ETAPA_LABELS[dados.etapaAtual] ?? dados.etapaAtual} />
            <Info linha="⏱️ Dias na etapa" valor={`${dados.diasNaEtapa} dias`} />
            {dados.vgv && <Info linha="💰 VGV" valor={`R$ ${dados.vgv.toLocaleString('pt-BR')}`} />}
            {dados.comissaoValor && <Info linha="💵 Comissão" valor={`R$ ${dados.comissaoValor.toLocaleString('pt-BR')}`} />}
            <Info linha="📞 Último contato" valor={dados.ultimaAtividadeEm ? new Date(dados.ultimaAtividadeEm).toLocaleString('pt-BR') : 'Nunca'} />
            <Info linha="⚠️ Dias sem contato" valor={`${dados.diasSemContato} dias`} cor={dados.diasSemContato > 3 ? 'text-red-500' : ''} />
          </div>

          {/* Próxima ação */}
          {dados.proximaAcao && (
            <div className="rounded-md bg-blue-50 p-3 text-xs">
              <p className="font-semibold text-blue-800">Próxima ação</p>
              <p className="mt-0.5 text-blue-700">{dados.proximaAcao}</p>
              {dados.proximaAcaoEm && (
                <p className="mt-0.5 text-blue-400">Prazo: {new Date(dados.proximaAcaoEm).toLocaleDateString('pt-BR')}</p>
              )}
            </div>
          )}

          {/* Pendências */}
          {(dados.pendenciaDoc || dados.pendenciaAcao) && (
            <div className="rounded-md bg-red-50 p-3 text-xs">
              <p className="font-semibold text-red-800">Pendências</p>
              {dados.pendenciaDoc && <p className="text-red-600">📄 Documentos pendentes de validação</p>}
              {dados.pendenciaAcao && <p className="text-red-600">⚠️ Próxima ação vencida ou não definida</p>}
            </div>
          )}

          {/* Sprint 7: Bloqueio documental */}
          {mensagemBloqueio && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs">
              <p className="font-semibold text-red-800">🚫 Avanço bloqueado</p>
              <p className="mt-0.5 text-red-600">{mensagemBloqueio}</p>
              <button onClick={() => setMensagemBloqueio(null)} className="mt-1 text-[10px] text-red-400 hover:text-red-600">Fechar</button>
            </div>
          )}

          {/* Avançar etapa */}
          {proximas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Avançar para:</p>
              <div className="flex flex-wrap gap-1.5">
                {proximas.map((etapa) => (
                  <button
                    key={etapa}
                    onClick={() => avancarEtapa(etapa)}
                    className="rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition"
                  >
                    {ETAPA_LABELS[etapa] ?? etapa}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documentos */}
          {dados.documentos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Documentos</p>
              <div className="space-y-1">
                {dados.documentos.map((d) => (
                  <div key={d.id} className="flex justify-between text-[10px]">
                    <span className="text-gray-600">{d.tipo}</span>
                    <span className={d.status === 'VALIDADO' ? 'text-emerald-600' : d.status === 'REJEITADO' ? 'text-red-500' : 'text-amber-500'}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agendamentos */}
          {dados.agendamentos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Agenda</p>
              <div className="space-y-1">
                {dados.agendamentos.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-[10px] text-gray-500">
                    {new Date(a.dataHora).toLocaleDateString('pt-BR')} — {a.status}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atividades recentes */}
          {dados.atividadesRecentes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Atividades recentes</p>
              <div className="space-y-1">
                {dados.atividadesRecentes.slice(0, 5).map((a, i) => (
                  <div key={i} className="text-[10px] text-gray-500">
                    {new Date(a.created_at).toLocaleDateString('pt-BR')} — {a.tipo}
                    {a.resultado && `: ${a.resultado}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de etapas */}
          {dados.historicoEtapas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Histórico de etapas</p>
              <div className="space-y-1">
                {dados.historicoEtapas.map((h, i) => (
                  <div key={i} className="text-[10px] text-gray-500">
                    {ETAPA_LABELS[h.etapa] ?? h.etapa}: {new Date(h.data_entrada).toLocaleDateString('pt-BR')} → {new Date(h.data_saida).toLocaleDateString('pt-BR')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Info({ linha, valor, cor }: { linha: string; valor: string; cor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{linha}</span>
      <span className={`font-medium text-gray-700 truncate max-w-[180px] text-right ${cor ?? ''}`}>{valor}</span>
    </div>
  )
}