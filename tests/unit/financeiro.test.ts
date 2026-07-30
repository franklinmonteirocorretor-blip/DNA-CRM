import { describe, it, expect } from 'vitest'
import { formatarMoeda, formatarMoedaCompacta, formatarHoras, formatarHorasExtenso, formatarData, formatarDataHora } from '@/src/lib/formatters'

describe('Formatters — Formatadores', () => {
  describe('formatarMoeda', () => {
    it('formata valor em BRL', () => {
      const result = formatarMoeda(1500)
      expect(result).toContain('1.500,00')
      expect(result).toContain('R$')
    })

    it('formata centavos', () => {
      const result = formatarMoeda(99.99)
      expect(result).toContain('99,99')
    })
  })

  describe('formatarMoedaCompacta', () => {
    it('milhoes => M', () => {
      expect(formatarMoedaCompacta(1500000)).toBe('R$ 1.5M')
    })
    it('mil => k', () => {
      expect(formatarMoedaCompacta(25000)).toBe('R$ 25k')
    })
    it('valor menor que 1000 retorna direto', () => {
      expect(formatarMoedaCompacta(500)).toBe('R$ 500')
    })
  })

  describe('formatarHoras', () => {
    it('<24h retorna horas', () => {
      expect(formatarHoras(5)).toBe('5h')
    })
    it('<168h retorna dias', () => {
      expect(formatarHoras(48)).toBe('2 dias')
    })
    it('>=168h retorna semanas', () => {
      expect(formatarHoras(168)).toBe('1 sem')
    })
  })

  describe('formatarHorasExtenso', () => {
    it('>=30 dias => meses', () => {
      expect(formatarHorasExtenso(720)).toBe('1 meses')
    })
    it('< 24h => horas', () => {
      expect(formatarHorasExtenso(5)).toBe('5h')
    })
    it('>= 1 dia => dias', () => {
      expect(formatarHorasExtenso(48)).toBe('2 dias')
    })
  })

  describe('formatarData', () => {
    it('monthly => nome do mes', () => {
      expect(formatarData('2026-07-15', 'monthly')).toContain('Jul')
      expect(formatarData('2026-07-15', 'monthly')).toContain('2026')
    })
    it('weekly => Sem. prefix', () => {
      expect(formatarData('2026-07-15', 'weekly')).toContain('Sem.')
    })
    it('daily => dd/mm', () => {
      const result = formatarData('2026-07-15', 'daily')
      expect(result).toContain('15')
      expect(result).toContain('07')
    })
  })

  describe('formatarDataHora', () => {
    it('hoje mostra Hoje, hh:mm', () => {
      const agora = new Date().toISOString()
      expect(formatarDataHora(agora)).toContain('Hoje,')
    })
    it('amanha mostra Amanha,', () => {
      const amanha = new Date(Date.now() + 86400000).toISOString()
      expect(formatarDataHora(amanha)).toContain('Amanhã,')
    })
    it('outra data mostra dd/mm às hh:mm', () => {
      const data = '2025-01-15T14:30:00.000Z'
      const result = formatarDataHora(data)
      expect(result).toContain('às')
    })
  })
})