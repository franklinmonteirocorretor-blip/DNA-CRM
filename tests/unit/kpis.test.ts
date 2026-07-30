import { describe, it, expect } from 'vitest'
import { KPI_METAS_OFICIAIS, KPI_LABELS, calcularPercentualKPI } from '@/src/config/kpis'

describe('KPIs — Metas Diárias', () => {
  describe('KPI_METAS_OFICIAIS', () => {
    it('define metas conhecidas', () => {
      expect(KPI_METAS_OFICIAIS.ligacoes).toBe(80)
      expect(KPI_METAS_OFICIAIS.whatsapps).toBe(40)
      expect(KPI_METAS_OFICIAIS.followUps).toBe(20)
      expect(KPI_METAS_OFICIAIS.agendamentos).toBe(2)
      expect(KPI_METAS_OFICIAIS.comparecimentos).toBe(2)
      expect(KPI_METAS_OFICIAIS.pastas).toBe(1)
    })

    it('KPI_LABELS tem label definido para todos', () => {
      for (const chave of Object.keys(KPI_METAS_OFICIAIS)) {
        expect(KPI_LABELS[chave as keyof typeof KPI_METAS_OFICIAIS]).toBeDefined()
      }
    })
  })

  describe('calcularPercentualKPI', () => {
    it('retorna 100 e status META_BATIDA quando tudo >= meta', () => {
      const result = calcularPercentualKPI({
        ligacoes: 80, whatsapps: 40, followUps: 20,
        agendamentos: 2, comparecimentos: 2, pastas: 1,
      })
      expect(result.percentual).toBe(100)
      expect(result.status).toBe('META_BATIDA')
    })

    it('retorna percentual médio das 6 métricas', () => {
      const result = calcularPercentualKPI({
        ligacoes: 40,
        whatsapps: 20,
        followUps: 10,
        agendamentos: 1,
        comparecimentos: 1,
        pastas: 0,
      })
      // (50+50+50+50+50+0)/6 = 250/6 = 41.66 -> 42
      expect(result.percentual).toBe(42)
      expect(result.status).toBe('META_PENDENTE')
    })

    it('cap individual a 100%', () => {
      const result = calcularPercentualKPI({
        ligacoes: 200, whatsapps: 100, followUps: 50,
        agendamentos: 10, comparecimentos: 10, pastas: 5,
      })
      expect(result.percentual).toBe(100)
      expect(result.status).toBe('META_BATIDA')
    })

    it('tudo 0 retorna 0%', () => {
      const result = calcularPercentualKPI({
        ligacoes: 0, whatsapps: 0, followUps: 0,
        agendamentos: 0, comparecimentos: 0, pastas: 0,
      })
      expect(result.percentual).toBe(0)
      expect(result.status).toBe('META_PENDENTE')
    })
  })
})