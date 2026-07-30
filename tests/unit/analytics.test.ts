import { describe, it, expect } from 'vitest'
import {
  hoje,
  inicioDoMes,
  ultimoDiaDoMes,
  diasRestantesNoMes,
  diasAtras,
  diasAFrenteInicio,
  diasAFrenteFim,
  hojeInicio,
  hojeFim,
  diasEntre,
  diasDesdeData,
  minutosDesdeData,
  inicioDaSemana,
  fimDaSemana,
} from '@/src/lib/analytics'

describe('Analytics — Datas e métricas', () => {
  describe('hoje', () => {
    it('retorna string no formato YYYY-MM-DD', () => {
      const data = hoje()
      expect(data).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('inicioDoMes / ultimoDiaDoMes', () => {
    it('inicioDoMes termina com -01', () => {
      expect(inicioDoMes()).toMatch(/-01$/)
    })
    it('ultimoDiaDoMes retorna formato YYYY-MM-DD', () => {
      expect(ultimoDiaDoMes()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('diasRestantesNoMes', () => {
    it('retorna número >= 0', () => {
      expect(diasRestantesNoMes()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('diasAtras', () => {
    it('retorna ISO string com timezone', () => {
      // O código usa .toISOString() que inclui timezone Z (UTC)
      expect(diasAtras(5)).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
    })
  })

  describe('diasAFrenteInicio / diasAFrenteFim', () => {
    it('inicio e fim retornam ISO válido (timezone local)', () => {
      // O código seta .setHours(0) em data local, mas .toISOString()
      // converte pra UTC. Em BRT (UTC-3), meia-noite local = 03:00 UTC
      const dataInicio = diasAFrenteInicio(1)
      const dataFim = diasAFrenteFim(1)
      expect(dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(dataFim).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('hojeInicio / hojeFim', () => {
    it('ambos são ISO válidos', () => {
      expect(hojeInicio()).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(hojeFim()).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('diasEntre', () => {
    it('calcula diferença correta', () => {
      expect(diasEntre('2026-07-01', '2026-07-05')).toBe(4)
    })
    it('negativo se b < a', () => {
      expect(diasEntre('2026-07-05', '2026-07-01')).toBe(-4)
    })
  })

  describe('diasDesdeData', () => {
    it('dias desde ontem >= 1', () => {
      const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      expect(diasDesdeData(ontem)).toBeGreaterThanOrEqual(1)
    })
  })

  describe('minutosDesdeData', () => {
    it('1 hora atrás ~ 60 minutos', () => {
      const umaHora = new Date(Date.now() - 3600000).toISOString()
      expect(minutosDesdeData(umaHora)).toBeGreaterThanOrEqual(59)
    })
  })

  describe('inicioDaSemana / fimDaSemana', () => {
    it('ambos são datas ISO válidas', () => {
      expect(inicioDaSemana()).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(fimDaSemana()).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})