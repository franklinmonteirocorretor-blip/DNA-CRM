import { NextRequest, NextResponse } from 'next/server'
import { gerarDadosRelatorio } from '@/app/dashboard/relatorios/actions'

// ── GET /api/relatorios/excel?tipo=producao&dataInicio=...&dataFim=... ────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') ?? 'producao'
    const dataInicio = searchParams.get('dataInicio') ?? ''
    const dataFim = searchParams.get('dataFim') ?? ''

    if (!dataInicio || !dataFim) {
      return NextResponse.json({ erro: 'Período obrigatório.' }, { status: 400 })
    }

    const dados = await gerarDadosRelatorio(tipo, dataInicio, dataFim)

    // Gera CSV
    let csv = '\uFEFF' // BOM para Excel ler UTF-8
    csv += dados.titulo + '\n'
    csv += `Período: ${dados.periodo}\n`
    csv += `Gerado em: ${dados.geradoEm}\n\n`

    // Cabeçalho
    csv += dados.colunas.join(';') + '\n'

    // Linhas
    for (const linha of dados.linhas) {
      csv += dados.colunas
        .map((col) => {
          const val = linha[col]
          if (val === null || val === undefined) return ''
          return String(val).replace(/;/g, ',')
        })
        .join(';') + '\n'
    }

    // Resumo
    csv += '\nRESUMO\n'
    for (const r of dados.resumo) {
      csv += `${r.label};${r.valor}\n`
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${tipo}-${dataInicio}.csv"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao gerar Excel.'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}