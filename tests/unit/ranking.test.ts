import { describe, it, expect } from 'vitest'
import { ordenarRanking, atribuirPosicoes } from '@/src/lib/ranking'
import { calcularPontuacao, PONTUACAO_RANKING } from '@/src/config/ranking'

describe('Ranking — Ordenação e Pontuação', () => {
  describe('calcularPontuacao', () => {
    it('retorna 0 se producao zerada', () => {
      const result = calcularPontuacao({
        vendas: 0, aprovacoes: 0, comparecimentos: 0,
        agendamentos: 0, pastas: 0, followUps: 0,
        whatsapps: 0, ligacoes: 0,
      })
      expect(result).toBe(0)
    })

    it('calcula venda + aprovacao + comparecimento + outros', () => {
      const result = calcularPontuacao({
        vendas: 2, aprovacoes: 3, comparecimentos: 5,
        agendamentos: 10, pastas: 4, followUps: 20,
        whatsapps: 100, ligacoes: 500,
      })
      const expected =
        2 * 1000 + 3 * 300 + 5 * 120 + 10 * 70 +
        4 * 40 + 20 * 10 + 100 * 3 + 500 * 1
      expect(result).toBe(5360)
    })

    it('PONTUACAO_RANKING tem os valores da config', () => {
      expect(PONTUACAO_RANKING.venda).toBe(1000)
      expect(PONTUACAO_RANKING.aprovacao).toBe(300)
      expect(PONTUACAO_RANKING.comparecimento).toBe(120)
      expect(PONTUACAO_RANKING.agendamento).toBe(70)
      expect(PONTUACAO_RANKING.pasta).toBe(40)
      expect(PONTUACAO_RANKING.followUp).toBe(10)
      expect(PONTUACAO_RANKING.whatsapp).toBe(3)
      expect(PONTUACAO_RANKING.ligacao).toBe(1)
    })
  })

  describe('ordenarRanking', () => {
    it('ordena por pontuacao decrescente', () => {
      const items = [
        { nome: 'Maria', pontuacao: 500 },
        { nome: 'Joao', pontuacao: 1500 },
        { nome: 'Ana', pontuacao: 300 },
      ]
      const ordenado = ordenarRanking(items)
      expect(ordenado[0].nome).toBe('Joao')
      expect(ordenado[1].nome).toBe('Maria')
      expect(ordenado[2].nome).toBe('Ana')
    })

    it('array vazio retorna vazio', () => {
      expect(ordenarRanking([])).toEqual([])
    })

    it('um unico item retorna o proprio', () => {
      const single = [{ nome: 'Solo', pontuacao: 10 }]
      expect(ordenarRanking(single)).toEqual(single)
    })
  })

  describe('atribuirPosicoes', () => {
    it('atribui posicoes 1,2,3', () => {
      const items = [
        { nome: 'A', valor: 100 },
        { nome: 'B', valor: 50 },
        { nome: 'C', valor: 75 },
      ]
      const result = atribuirPosicoes(items, (item) => item.valor)
      expect(result[0].posicao).toBe(1)
      expect(result[0].nome).toBe('A')
      expect(result[1].posicao).toBe(2)
      expect(result[1].nome).toBe('C')
      expect(result[2].posicao).toBe(3)
      expect(result[2].nome).toBe('B')
    })

    it('empates compartilham a mesma posicao', () => {
      const items = [
        { nome: 'X', pontos: 100 },
        { nome: 'Y', pontos: 100 },
        { nome: 'Z', pontos: 50 },
      ]
      const result = atribuirPosicoes(items, (i) => i.pontos)
      expect(result[0].posicao).toBe(1)
      expect(result[1].posicao).toBe(1)
      expect(result[2].posicao).toBe(3)
    })

    it('array vazio retorna vazio', () => {
      expect(atribuirPosicoes([], () => 1)).toEqual([])
    })
  })
})