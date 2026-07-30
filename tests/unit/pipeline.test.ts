import { describe, it, expect } from 'vitest'
import {
  calcularTaxaConversao,
  calcularConversaoGeral,
  calcularTempoMedioEtapa,
  calcularTempoEtapaAtualHoras,
  calcularTaxasConversaoFunil,
} from '@/src/lib/pipeline'

describe('Pipeline — Biblioteca de cálculos', () => {
  describe('calcularTaxaConversao', () => {
    it('retorna null para a primeira etapa (NOVO_LEAD)', () => {
      const contagem = { NOVO_LEAD: 100, CONTATOS: 80 }
      const result = calcularTaxaConversao(contagem, 'NOVO_LEAD')
      expect(result).toBeNull()
    })

    it('retorna taxa correta de conversao de NOVO_LEAD para CONTATOS', () => {
      const contagem = { NOVO_LEAD: 100, CONTATOS: 50 }
      const result = calcularTaxaConversao(contagem, 'CONTATOS')
      expect(result).toBe(50)
    })

    it('retorna null quando a etapa anterior tem 0', () => {
      const contagem = { NOVO_LEAD: 0, CONTATOS: 5 }
      const result = calcularTaxaConversao(contagem, 'CONTATOS')
      expect(result).toBeNull()
    })

    it('retorna 0 quando a etapa atual tem 0 mas anterior tem >0', () => {
      const contagem = { NOVO_LEAD: 100, CONTATOS: 0 }
      const result = calcularTaxaConversao(contagem, 'CONTATOS')
      expect(result).toBe(0)
    })

    it('arredonda taxa de conversao', () => {
      const contagem = { NOVO_LEAD: 7, CONTATOS: 3 }
      const result = calcularTaxaConversao(contagem, 'CONTATOS')
      expect(result).toBe(43) // 3/7 * 100 = 42.857 -> 43
    })

    it('retorna taxa para ultima etapa do funil', () => {
      const contagem = { FECHAMENTOS: 10, POS_VENDA: 8 }
      const result = calcularTaxaConversao(contagem, 'POS_VENDA')
      expect(result).toBe(80)
    })
  })

  describe('calcularConversaoGeral', () => {
    it('retorna 0 se nao houver leads', () => {
      const contagem: Record<string, number> = {}
      expect(calcularConversaoGeral(contagem)).toBe(0)
    })

    it('calcula conversao geral (leads -> fechamento + pos-venda)', () => {
      const contagem = {
        NOVO_LEAD: 10, CONTATOS: 5, AGENDAMENTO: 4,
        COMPARECIMENTO: 3, ANALISE: 2, RESTRICOES: 1,
        CONDICIONADOS: 0, APROVADOS: 0,
        FECHAMENTOS: 2, POS_VENDA: 1,
      }
      const result = calcularConversaoGeral(contagem)
      expect(result).toBe(11) // (2 + 1) / (10+5+4+3+2+1+0+0+2+1) = 3/28 = 10.7 -> 11
    })
  })

  describe('calcularTempoMedioEtapa', () => {
    it('retorna 0 para array vazio', () => {
      expect(calcularTempoMedioEtapa([])).toBe(0)
    })

    it('calcula total de horas entre data_entrada e data_saida', () => {
      const tempos = [
        {
          etapa: 'NOVO_LEAD',
          data_entrada: '2026-07-01T00:00:00Z',
          data_saida: '2026-07-01T12:00:00Z',
        },
        {
          etapa: 'CONTATOS',
          data_entrada: '2026-07-01T12:00:00Z',
          data_saida: '2026-07-02T12:00:00Z',
        },
      ]
      const resultado = calcularTempoMedioEtapa(tempos)
      expect(resultado).toBe(36) // 12h + 24h
    })
  })

  describe('calcularTempoEtapaAtualHoras', () => {
    it('retorna um numero positivo para uma data no passado', () => {
      const umaHoraAtras = new Date(Date.now() - 3600000).toISOString()
      const resultado = calcularTempoEtapaAtualHoras(umaHoraAtras)
      expect(resultado).toBeGreaterThanOrEqual(1)
    })

    it('retorna 0 para data agora', () => {
      const agora = new Date().toISOString()
      const resultado = calcularTempoEtapaAtualHoras(agora)
      expect(resultado).toBe(0)
    })
  })

  describe('calcularTaxasConversaoFunil', () => {
    it('retorna conversao para cada etapa (exceto primeira)', () => {
      const contagem: Record<string, number> = {
        NOVO_LEAD: 100, CONTATOS: 80, AGENDAMENTO: 40,
        COMPARECIMENTO: 30, ANALISE: 20, RESTRICOES: 5,
        CONDICIONADOS: 5, APROVADOS: 10,
        FECHAMENTOS: 5, POS_VENDA: 5,
      }
      const taxas = calcularTaxasConversaoFunil(contagem)
      expect(taxas['CONTATOS']).toBe(80)
      expect(taxas['FECHAMENTOS']).toBe(50)
      expect(taxas['POS_VENDA']).toBe(100)
    })

    it('retorna null quando etapa anterior tem 0 ', () => {
      const contagem: Record<string, number> = { NOVO_LEAD: 0, CONTATOS: 0 }
      const taxas = calcularTaxasConversaoFunil(contagem)
      expect(taxas['CONTATOS']).toBeNull()
    })
  })
})