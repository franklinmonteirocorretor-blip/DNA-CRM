import { describe, it, expect } from 'vitest'
import { calcularKPIsCorretor, somarProducao } from '@/src/lib/dashboard'

describe('Dashboard — KPIs e Produção', () => {
  describe('calcularKPIsCorretor', () => {
    it('meta batida — 100% em tudo', () => {
      const result = calcularKPIsCorretor({
        ligacoes: 80, whatsapps: 40, followUps: 20,
        agendamentos: 2, comparecimentos: 2, pastas: 1,
      })
      expect(result.percentualDiario).toBe(100)
      expect(result.status).toBe('META_BATIDA')
    })

    it('metade = ~42%', () => {
      const result = calcularKPIsCorretor({
        ligacoes: 40, whatsapps: 20, followUps: 10,
        agendamentos: 1, comparecimentos: 1, pastas: 0,
      })
      expect(result.percentualDiario).toBe(42)
      expect(result.status).toBe('META_PENDENTE')
    })

    it('zero = 0%', () => {
      const result = calcularKPIsCorretor({
        ligacoes: 0, whatsapps: 0, followUps: 0,
        agendamentos: 0, comparecimentos: 0, pastas: 0,
      })
      expect(result.percentualDiario).toBe(0)
      expect(result.status).toBe('META_PENDENTE')
    })
  })

  describe('somarProducao', () => {
    it('soma produção de vários registros', () => {
      const rows = [
        { vendas: 1, aprovacoes: 2, agendamentos: 3, comparecimentos: 1, pastas: 0, ligacoes: 10, whatsapps: 5, followUps: 2 },
        { vendas: 0, aprovacoes: 1, agendamentos: 2, comparecimentos: 0, pastas: 1, ligacoes: 5, whatsapps: 3, followUps: 1 },
      ]
      const result = somarProducao(rows)
      expect(result.vendas).toBe(1)
      expect(result.aprovacoes).toBe(3)
      expect(result.agendamentos).toBe(5)
      expect(result.ligacoes).toBe(15)
    })

    it('array vazio retorna tudo 0', () => {
      const result = somarProducao([])
      expect(result.vendas).toBe(0)
      expect(result.ligacoes).toBe(0)
    })

    it('rows com campos opcionais faltando', () => {
      const result = somarProducao([{ vendas: 2, aprovacoes: 0, agendamentos: 0, comparecimentos: 0, pastas: 0 }])
      expect(result.vendas).toBe(2)
      expect(result.ligacoes).toBe(0)
    })
  })
})