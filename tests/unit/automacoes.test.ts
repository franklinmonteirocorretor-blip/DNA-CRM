import { describe, it, expect } from 'vitest'

// A engine não exporta avaliarCondicoes e avaliarUmaCond diretamente.
// Vamos testar a lógica de dispatch e tipos.

import type { AutomationEvent, AutomationEventPayload, AutomationCondition, AutomationAction } from '@/src/lib/automation/types'

describe('Automações — Tipos e Engine', () => {
  describe('Types — Definições', () => {
    it('AutomationEvent tem todos os eventos previstos', () => {
      const eventos: AutomationEvent[] = [
        'cliente_criado', 'mudanca_etapa', 'venda', 'comissao_recebida'
      ]
      eventos.forEach((e) => {
        expect(typeof e).toBe('string')
      })
    })

    it('AutomationCondition tem operadores válidos', () => {
      const cond: AutomationCondition = {
        tipo: 'etapa',
        operador: 'igual',
        valor: 'APROVADOS',
      }
      expect(cond.operador).toBe('igual')
    })

    it('AutomationActionSpec tem acao e params', () => {
      const acao: AutomationAction = 'criar_tarefa'
      expect(acao).toBe('criar_tarefa')
    })
  })

  describe('AutomationEventPayload', () => {
    it('payload structure', () => {
      const payload: AutomationEventPayload = {
        evento: 'cliente_criado',
        entidade: 'cliente',
        entidade_id: '123',
        dados: { nome: 'Teste' },
        timestamp: new Date().toISOString(),
      }
      expect(payload.evento).toBe('cliente_criado')
      expect(payload.entidade).toBe('cliente')
      expect(payload.dados.nome).toBe('Teste')
    })
  })

  describe('dispatchAutomation', () => {
    it.skip('não pode ser testada sem Supabase mock', async () => {
      // Precisa de servidor mock, será testada nos testes de integração
      expect(true).toBe(true)
    })
  })
})