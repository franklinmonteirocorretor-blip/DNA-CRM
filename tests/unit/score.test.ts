import { describe, it, expect } from 'vitest'
import {
  calcularProbabilidadeFechamento,
  calcularScoreCliente,
  calcularPrioridadeFollowUp,
} from '@/src/lib/score'

describe('Score — Probabilidade e Prioridade', () => {
  describe('calcularProbabilidadeFechamento', () => {
    it('cliente em NOVO_LEAD sem atividade retorna score baixo ', () => {
      const resultado = calcularProbabilidadeFechamento({
        etapaAtual: 'NOVO_LEAD',
        diasNaEtapa: 0,
        docsPendentes: 5,
        totalContatos: 0,
        totalAgendamentos: 0,
        totalComparecimentos: 0,
      })
      // Base: 0 + penalidade docs: -25 (5*5 capped). Score = max(0, min(100, -25)) => 0
      expect(resultado).toBe(0)
    })

    it('cliente muito avançado com engajamento retorna alto ', () => {
      const resultado = calcularProbabilidadeFechamento({
        etapaAtual: 'APROVADOS',
        diasNaEtapa: 2,
        docsPendentes: 0,
        totalContatos: 15,
        totalAgendamentos: 3,
        totalComparecimentos: 2,
      })
      // idx 7 * 9 = 63 - 0 (docs) - 0 (dias) + 6 (3*2) + 6 (comparec) + 3 (15/5) = 78
      expect(resultado).toBe(78)
    })

    it('penaliza cliente parado na etapa ', () => {
      const resultado = calcularProbabilidadeFechamento({
        etapaAtual: 'NOVO_LEAD',
        diasNaEtapa: 17,
        docsPendentes: 0,
        totalContatos: 0,
        totalAgendamentos: 0,
        totalComparecimentos: 0,
      })
      // 0 0*9=0 - (17-7)*2 = 20 penal mas cap? não: min(20,20) = 20 - 0 docs = +0:  0-20 = -20 => 0
      expect(resultado).toBe(0)
    })

    it('capped em 100 ', () => {
      const resultado = calcularProbabilidadeFechamento({
        etapaAtual: 'POS_VENDA',
        diasNaEtapa: 1,
        docsPendentes: 0,
        totalContatos: 50,
        totalAgendamentos: 10,
        totalComparecimentos: 10,
      })
      expect(resultado).toBe(100)
    })
  })

  describe('calcularScoreCliente', () => {
    it('score base neutra 50 ', () => {
      const result = calcularScoreCliente({
        etapaAtual: 'NOVO_LEAD',
        diasNaEtapa: 0,
        docsCompletos: false,
        totalContatos: 0,
        totalAgendamentos: 0,
        totalComparecimentos: 0,
        tempoTotalHoras: 0,
      })
      expect(result) .toBe(50)
    })

    it('cliente completo (docs + avanzado + engajado) retorna  alto ', () => {
      const result = calcularScoreCliente({
        etapaAtual: 'FECHAMENTOS',
        diasNaEtapa: 1,
        docsCompletos: true,
        totalContatos: 20,
        totalAgendamentos: 5,
        totalComparecimentos: 3,
        tempoTotalHoras: 100,
      })
      // 50 + 32 (8*4) + 15 (docs) + 9 (3*3) + 5 (ag**) capped 5) + 4 (20/5) = 115 => 100
      expect(result).toBe(100)
    })

    it('penaliza tempo total>30 dias ', () => {
      const result = calcularScoreCliente({
        etapaAtual: 'APROVADOS',
        diasNaEtapa: 0,
        docsCompletos: false,
        totalContatos: 0,
        totalAgendamentos: 0,
        totalComparecimentos: 0,
        tempoTotalHoras: 1000,
      })
      // 50 + 28 (7*4) + 0 - (50-720)/168*2 = 1000-720= 280/168= 1.67 -> floor=1*2=2 => 78
      expect(result).toBe(76)
    })
  })

  describe('calcularPrioridadeFollowUp', () => {
    it('lead novo tem prioridade base', () => {
      const result = calcularPrioridadeFollowUp({
        etapa_atual: 'NOVO_LEAD',
        ultima_atividade_em: new Date().toISOString(),
        proxima_acao_em: null,
        created_at: new Date().toISOString(),
        documentos_pendentes: 0,
      })
      expect(result).toBe(150)
    })

    it('cliente sem contato ha 7 dias soma  pontos', () => {
      const result = calcularPrioridadeFollowUp({
        etapa_atual: 'AGENDAMENTO',
        ultima_atividade_em: new Date(Date.now() - 7 * 86400000).toISOString(),
        proxima_acao_em: null,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        documentos_pendentes: 2,
      })
      // diasSemContato=7, >= 5: 100*(7-4)=300
      //nao novo lead =0
      // docs: 100 (2*50)
      // nda vencido? null => 0
      // diasDesdeCriacao=10, diasSemContato=7 < diasDesdeCriacao => nao soma
      // Total: 300+100=400
      expect(result).toBe(400)
    })

    it('acao vencida soma 200', () => {
      const result = calcularPrioridadeFollowUp({
        etapa_atual: 'ANALISE',
        ultima_atividade_em: new Date(Date.now() - 2 * 86400000).toISOString(),
        proxima_acao_em: new Date(Date.now() - 1 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        documentos_pendentes: 0,
      })
      // diasSemContato=2 - sem soma esquecido
      // 200 vencido + 0 docs + 0 novo = 200
      expect(result).toBe(200)
    })

    it('capped em 1000', () => {
      const result = calcularPrioridadeFollowUp({
        etapa_atual: 'NOVO_LEADM',
        ultima_atividade_em: new Date(Date.now() - 30 * 86400000).toISOString(),
        proxima_acao_em: new Date(Date.now() - 5 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        documentos_pendentes: 5,
      })
      // diasSemContato=30, >=5: 100*(30-4)=2600 min(2600,500)=500
      // 150 novo + 250 docs (5*50) + 200 vencido = 600 → total 1100 => 1000
      expect(result).toBe(1000)
    })
  })
})