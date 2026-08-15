<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Monteiro CRM - regras permanentes do projeto

Antes de alterar qualquer arquivo, leia `PROJECT_STATE.md` por completo.

## Escopo e disciplina

- Trabalhe somente na feature pedida na tarefa atual. Nao remova, redesenhe ou simplifique modulos fora do escopo.
- Uma tela por vez deve ser apresentada e aprovada pelo proprietario.
- Nao introduza dados ficticios nos indicadores de producao. O unico registro artificial permitido e o `CLIENTE TESTE - MONTEIRO CRM`, isolado das metricas.
- Toda acao visivel deve funcionar. Nao crie botoes decorativos, links vazios ou simulacoes de persistencia.
- Antes de concluir: build, teste do fluxo alterado e verificacao visual na producao.
- Preserve segredos: nunca versionar `.env.local`, `.credentials.local.txt`, chaves Supabase, cookies, banco local, documentos privados ou dados exportados.

## Fonte unica e integracao

- A ficha unica do cliente e a fonte de verdade. Qualificacao, follow-up, funil, analise, fechamento, VGV, agenda e pos-venda devem refletir o mesmo registro e a mesma linha do tempo.
- Fluxo de catalogo obrigatorio: `Construtora -> Empreendimentos da construtora`.
- Resultado de analise de credito e informado pelo CCA. Fechamento e definido apenas na Mesa de Fechamento.
- Todo atendimento deve terminar com proxima acao registrada.
- Distribuicao automatica de prospeccao ocorre de segunda a sexta. Sabado e reservado a agenda, visitas, feiroes e atividades comerciais.
- Cadencia padrao: D0, D1, D3, D7, D15 e D30, individual por cliente e editavel.

## Identidade visual

- Paleta principal: preto, dourado e branco.
- Verde somente para acao concluida/confirmada/recebida integralmente.
- Dourado para acao primaria, pendencia ativa ou pagamento parcial.
- Vermelho para erro, atraso, vencimento ou pagamento nao recebido.
- Botoes de acao: dourado, texto preto, compactos, elegantes, cursor de mao e estados hover/focus claros.
- Evitar botoes cinza. Controles inativos podem ser pretos com borda e texto dourados.
- WhatsApp sempre com logo oficial verde; ligacao sempre com icone de telefone padronizado.
- Sidebar, logo, foto, tipografia e dimensoes nao podem variar entre rotas nem piscar durante a navegacao.
- Valores monetarios: `R$ 240.000,00`. Percentuais: `6%`.
- O favicon e a logo oficial Monteiro.

## Comandos obrigatorios

```powershell
npm run build
npm run lint
npx vercel --prod --yes
```

Use `npm run dev` para validacao local e teste a rota afetada antes do deploy.
