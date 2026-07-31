// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Painel do Cliente: informações do cliente selecionado e ações rápidas.
// Aparece à direita da tela de chat.

import Link from 'next/link'
import type { WhatsAppConversaEnriquecida } from '@/src/types/whatsapp'

interface PainelClienteProps {
  conversa: WhatsAppConversaEnriquecida | null
}

export function PainelCliente({ conversa }: PainelClienteProps) {
  if (!conversa) {
    return (
      <div className="flex flex-col border-l bg-gray-50 p-6">
        <p className="text-xs text-gray-400 text-center">Selecione uma conversa para ver os detalhes do cliente.</p>
      </div>
    )
  }

  const c = conversa.cliente

  return (
    <div className="flex flex-col border-l bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{c.nome}</h3>
        <p className="text-xs text-gray-500">{c.telefone}</p>
      </div>

      {/* Dados CRM */}
      <div className="flex-1 space-y-5 p-4">
        <InfoLinha label="Etapa" value={c.etapa_atual} />
        <InfoLinha label="Corretor" value={c.corretor_nome} />
        <InfoLinha label="Criada em" value={conversa.conversa.created_at ? new Date(conversa.conversa.created_at).toLocaleDateString('pt-BR') : '—'} />
        <InfoLinha label="Mensagens" value={String(conversa.conversa.total_mensagens)} />
        <div>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Não lidas</span>
          {conversa.naoLidas > 0 ? (
            <p className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 inline-block mt-0.5">
              {conversa.naoLidas}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">0</p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="border-t px-4 py-3 space-y-2">
        <Link
          href={`/dashboard/clientes/${c.id}`}
          className="block w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white text-center hover:bg-blue-700"
        >
          Ver Cliente 360°
        </Link>
        <button className="w-full rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 py-1">
          Finalizar Conversa
        </button>
      </div>
    </div>
  )
}

function InfoLinha({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}