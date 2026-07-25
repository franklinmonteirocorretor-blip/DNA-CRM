// ─── Configuração Centralizada de Documentos ───────────────────────────────────
// Sprint 10 — labels de tipos, checklist obrigatório por etapa
// Já existia CHECKLIST_OBRIGATORIO e TIPO_DOCUMENTO_LABEL em src/types/index.ts,
// mas algumas duplicatas ainda estavam em componentes. Este arquivo consolida tudo.

import type { EtapaFunil, TipoDocumento } from '@/src/types'

// Re-export do que já está nos types (para que config/ seja a fonte única)
export { CHECKLIST_OBRIGATORIO, TIPO_DOCUMENTO_LABEL } from '@/src/types'

/** Label resumida do tipo de documento (usado em cards de alerta, badges) */
export const DOC_LABEL_RESUMIDO: Partial<Record<TipoDocumento, string>> = {
  COMPROVANTE_RENDA: 'Comprov. Renda',
  COMPROVANTE_ENDERECO: 'Comprov. Residência',
  CERTIDAO_NASCIMENTO: 'Cert. Nascimento',
  CERTIDAO_CASAMENTO: 'Cert. Casamento',
  CERTIDAO_CASAMENTO_AVERBACAO: 'Cert. Casam. Averb.',
  MO_AUTODECLARACAO_DEPENDENTE: 'Autodecl. Dependente',
  CARTEIRA_TRABALHO: 'Cart. Trabalho',
  EXTRATO_FGTS: 'FGTS',
  DECLARACAO_IR: 'Declaração IR',
  PROPOSTA_PDF: 'Proposta',
}

/** Status de validação visual (badge colors) */
export const STATUS_DOC_VISUAL: Record<string, { cor: string; label: string }> = {
  PENDENTE:   { cor: 'bg-amber-100 text-amber-700',   label: 'Pendente' },
  RECEBIDO:   { cor: 'bg-blue-100 text-blue-700',     label: 'Recebido' },
  EM_ANALISE: { cor: 'bg-purple-100 text-purple-700', label: 'Em Análise' },
  VALIDADO:   { cor: 'bg-emerald-100 text-emerald-700', label: 'Validado' },
  REJEITADO:  { cor: 'bg-red-100 text-red-700',       label: 'Rejeitado' },
}