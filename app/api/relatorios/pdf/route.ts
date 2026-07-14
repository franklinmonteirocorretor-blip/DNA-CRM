import { NextRequest, NextResponse } from 'next/server'
import { gerarDadosRelatorio } from '@/app/dashboard/relatorios/actions'

// ── GET /api/relatorios/pdf?tipo=producao&dataInicio=...&dataFim=... ──────────
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

    // Gera tabela HTML
    const thead = dados.colunas
      .map((col) => `<th style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;text-align:left;font-size:12px;font-weight:600;color:#374151">${col}</th>`)
      .join('')

    const tbody = dados.linhas
      .map(
        (linha) =>
          `<tr>${dados.colunas
            .map(
              (col) =>
                `<td style="padding:6px 12px;border:1px solid #e5e7eb;font-size:12px;color:#374151">${linha[col] ?? '—'}</td>`
            )
            .join('')}</tr>`
      )
      .join('')

    const resumoHtml = dados.resumo
      .map(
        (r) =>
          `<div style="display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">
            <span style="color:#6b7280;font-weight:500">${r.label}</span>
            <span style="color:#111827;font-weight:600">${r.valor}</span>
          </div>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${dados.titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; padding: 32px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitulo { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .resumo { max-width: 400px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-top: 24px; }
    .resumo h3 { font-size: 13px; font-weight: 600; padding: 8px 12px; background: #f3f4f6; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    @media print {
      body { padding: 16px; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${dados.titulo}</h1>
  <p class="subtitulo">Período: ${dados.periodo} · Gerado em: ${dados.geradoEm}</p>

  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>

  <div class="resumo">
    <h3>Resumo</h3>
    ${resumoHtml}
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${tipo}-${dataInicio}.html"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao gerar PDF.'
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}