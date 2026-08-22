# Monteiro CRM - estado do projeto

Atualizado em: 22/08/2026

## Objetivo

CRM particular de Franklin Monteiro para operacao imobiliaria Minha Casa Minha Vida, preparado para evoluir para uma imobiliaria. O sistema acompanha o cliente do primeiro contato ao suporte pos-entrega, mantendo produtividade, funil, financiamento, documentos, proposta, venda, comissao e historico em um unico ecossistema.

## Producao

- URL: https://monteiro-crm.vercel.app
- Hospedagem: Vercel.
- Banco e documentos de producao: Supabase.
- Autenticacao propria por sessao.
- Projeto local: `D:\Downloads\Compressed\dna-crm-documentacao-completa\monteiro-crm`.

## Arquitetura

- Next.js 16.3 App Router, React 19 e TypeScript.
- CSS por modulo/tela mais camadas globais `app/globals.css` e `app/crm-standard.css`.
- Navegacao compartilhada: `app/components/crm-navigation.tsx`.
- Perfil compartilhado: `app/components/profile-photo-provider.tsx`.
- Supabase server-side: `lib/supabase-admin.ts`.
- Compatibilidade/local legado SQLite: `lib/db.ts`; nao e a fonte de producao.
- Upload documental centralizado: `lib/upload-client-document.ts` e rotas de documentos.
- Migracoes: `supabase/migrations/`.
- Scripts operacionais: `scripts/`.

## Rotas principais

| Rota | Responsabilidade |
|---|---|
| `/` | Dashboard, metas, produtividade, agenda, follow-ups e funil resumido |
| `/carteira` | Carteira diaria, qualificacao e registro do contato |
| `/follow-ups` | Cadencia e recuperacao de clientes |
| `/funil` | Funil comercial e esteira de financiamento |
| `/agenda` | Compromissos, visitas, comparecimentos e atividades |
| `/analises` | Central de analises e recuperacao |
| `/clientes` | Banco completo e filtros de clientes |
| `/clientes/[id]` | Ficha unica, documentos e historico integral |
| `/fechamento` | Mesa de Fechamento, simulacao, proposta e resultado |
| `/financeiro` | VGV, comissoes e esteira de recebimentos |
| `/pos-venda` | Jornada apos fechamento ate suporte pos-entrega |
| `/bases` | Importacao, deduplicacao e distribuicao de bases |
| `/construtoras` | Construtoras, empreendimentos, valores, comissoes e midias |
| `/ccas` | Cadastro de correspondentes bancarios |
| `/indicadores` | KPIs, diagnosticos, funis e exportacoes |

## APIs

As rotas em `app/api/` cobrem: autenticacao, clientes, eventos, bases/importacao, carteira diaria, agenda, analises, catalogo/midias, CCAs, documentos, fechamento/simulacao, financeiro, metricas/exportacao e pos-venda.

## Modelo funcional consolidado

### Entrada e prospeccao

- Origens: Leads, listas frias, indicacao e carteira propria.
- Importacao por PDF, XLSX, CSV ou TXT.
- Deduplicacao por telefone/e-mail sem perder origens e interesses adicionais.
- Se um contato aparece em bases/produtos diferentes, manter um cliente e registrar todas as origens e interesses no historico.
- Bases podem ser mistas ou filtradas por construtora e empreendimento.

### Atendimento

- Meta diaria base: 50 ligacoes, 50 WhatsApps e follow-ups; operacao real distingue tentativa, contato efetivo e conversa qualificada.
- Toda interacao deve ser registrada e toda conversa deve sair com proxima acao.
- Cadencia: D0, D1, D3, D7, D15 e D30.
- Nao existe cliente perdido; existe cliente nao trabalhado, pausado ou em reativacao.

### Qualificacao MCMV

- Sexo, data de nascimento, estado civil, profissao/tipo de renda, renda, tempo de carteira, filhos/dependentes, regiao e empreendimento de interesse.
- Autonomo exige atividade exercida e tempo de atividade.
- Conjuge e dependente aparecem somente quando as regras do perfil exigirem.

### Analise e documentos

- Pre-analise: identidade/CPF ou CNH, endereco e renda; casado civil inclui documentos do conjuge.
- Dossie completo: documentos civis, renda, CTPS, FGTS quando aplicavel e documentos condicionais.
- Dependente somente no dossie completo, parentesco permitido e autodeclaracao de dependencia/sem renda.
- Multiplos arquivos por categoria, visualizacao e exclusao; unificacao em PDF para envio ao CCA.
- Carta de cancelamento de avaliacao anterior pode ser gerada e anexada.
- Resultado da analise: restricao, condicionado ou aprovado, informado pelo CCA e registrado na ficha.

### Fechamento

- Leitura de simulacoes CAIXA para financiamento, subsidio, parcela e modalidade.
- Proposta em quatro etapas: composicao/entrada, financiamento, taxas e resumo final pre/pós-chaves.
- Bonus da construtora e desconto no valor do imovel.
- Fechamento envia VGV ao financeiro; nao fechamento e negociacao exigem motivos/contexto proprios.

### Financeiro

- VGV mensal pode zerar no novo periodo, mas comissoes abertas permanecem ate quitacao.
- Status: vermelho nao recebido, dourado parcial/adiantado, verde integralmente recebido.
- Prazo de referencia apos contrato CAIXA: casas residenciais ate 7 dias; empreendimentos ate 30 dias.
- Desconto de NF e comissao sao percentuais. Adiantamento, bonus e recebimentos sao moeda BRL.

### Pos-venda

- Inicia no contrato com a construtora e segue sequencialmente: sinal/ATO, entrevista CAIXA, laudos/conformidade, contrato CAIXA, preparacao, vistoria particular, reparos, entrega, prova social, indicacoes e suporte.
- Etapa seguinte so libera apos registro da anterior.
- Marcos com data alimentam agenda, alertas e ficha do cliente.
- Consentimento de imagem admite aceitou ou recusou.
- Documentos e evidencias devem aceitar multiplos anexos, visualizacao e exclusao.

## Decisoes de dados e seguranca

- Producao usa dados reais; fixtures nao entram nos KPIs.
- `CLIENTE TESTE - MONTEIRO CRM` existe apenas para auditoria e deve ser excluido das metricas.
- Segredos ficam apenas em ambientes protegidos e arquivos locais ignorados pelo Git.
- Nao expor `SUPABASE_SECRET_KEY` no cliente.
- Nao versionar banco local, storage de clientes, exportacoes, cookies ou credenciais.

## Comandos

```powershell
npm install
npm run dev
npm run build
npm run lint
npm run backup
npm run import:bases
npm run migrate:supabase
npm run seed:test-client
npx vercel --prod --yes
```

## Estado tecnico verificado em 14/08/2026

- `npm run build`: aprovado. Compilacao, TypeScript e geracao das rotas concluidos.
- `npm run lint`: 17 erros e 11 avisos preexistentes, concentrados principalmente na regra React `set-state-in-effect`, dependencias de hooks e uma ocorrencia de `<img>`.
- O debito de lint nao bloqueia o build atual, mas deve ser tratado em uma thread propria chamada `Qualidade tecnica`, sem misturar com features de negocio ou ajustes visuais.

## Pendencia ativa imediata

### UI - padronizacao dos botoes

Substituir controles acinzentados e dificeis de identificar por botoes coerentes com a referencia aprovada:

- Acao primaria: gradiente dourado, texto preto, compacto e elegante.
- Filtro inativo: fundo preto, borda/texto dourados.
- Filtro ativo: dourado com texto preto.
- Verde somente para concluido/confirmado/WhatsApp.
- Vermelho somente para erro, atraso, vencido ou nao recebido.
- Nao transformar linhas, cards, etapas do funil ou containers clicaveis em botoes dourados.
- Comecar pela Carteira do Dia e depois auditar as demais telas.

## Outras pendencias que exigem verificacao por feature

Nao assumir resolucao apenas porque o codigo existe. Cada item precisa de teste funcional e visual:

- Dashboard: funil sem sobreposicao de textos; botoes de agenda e fila; data/saudacao dinamicas.
- Carteira: paginacao 10x5, base personalizada, KPIs de agendamento/comparecimento/pastas e salvamento sequencial.
- Follow-ups: auditoria completa da cadencia e persistencia.
- Funil: filtro sem sumir elementos e acao do gargalo no padrao visual.
- Agenda: salvar/editar compromisso e cadencia sugerida editavel.
- Analises/documentos: anexos, visualizacao, exclusao, unificacao e envio ao CCA.
- Fechamento: extracao real dos tres modelos CAIXA, galeria por empreendimento, proposta e envio ao VGV.
- Financeiro: botoes, filtros construtora/empreendimento, documentos fiscais e pagamentos persistentes.
- Pos-venda: etapas personalizadas, anexos e sincronizacao com agenda.
- Central de Clientes: ficha, historico completo, iniciar atendimento e filtros Leads/Listas.
- Padrao global: sidebar, logo, foto e tipografia sem flicker entre rotas.

## Metodo de trabalho daqui em diante

Uma tarefa/thread por feature. Exemplos:

- `UI - botoes e consistencia visual`
- `Dashboard - KPIs, agenda e funil`
- `Leads e Bases - importacao e deduplicacao`
- `Carteira e Qualificacao`
- `Follow-ups e Cadencia`
- `Funil e Analises`
- `Mesa de Fechamento`
- `VGV e Comissoes`
- `Pos-venda`

Prompt inicial obrigatorio de cada tarefa:

> Leia AGENTS.md + PROJECT_STATE.md e trabalhe somente na tarefa X.

## Estado técnico verificado em 15/08/2026

- Produção: `https://monteiro-crm.vercel.app`, deployment `dpl_3GrAdpVsqihLV6S5jNngMrN1C8JT`.
- `npm run lint`: aprovado sem erros ou avisos.
- `npm run build`: aprovado, incluindo TypeScript e 39 rotas.
- `npm test`: 2 testes críticos da mesa aprovados (bônus, entrada, saldo mensal e VGV bruto).
- `npm run verify:production`: login e catálogo reais aprovados; 3 construtoras e 6 empreendimentos.
- Verificação visual: 14 rotas críticas sem erros de console ou estouro horizontal em desktop.
- Responsividade: Dashboard, Agenda, Fechamento, Clientes, Construtoras e CCAs testados em 390x844; sem estouro horizontal após correção da Central de Clientes.
- Hierarquia comercial persistida e aplicada: Cidade → Construtora → Empreendimento.
- Central de Clientes agora pesquisa e filtra também por cidade, preservando construtora e empreendimento dependentes.
- Chave administrativa de produção migrada para `sb_secret_...` e sincronizada em Production, Preview e Development. A chave temporária local foi removida.
- Bloqueio externo: o painel Supabase ainda responde HTTP 400 ao comando “Disable JWT-based API keys”; a aplicação já não depende da chave `service_role` antiga, mas a desativação definitiva permanece pendente no provedor.

## Estado técnico verificado em 22/08/2026

- Worktree legado classificado e consolidado em commits auditáveis por domínio, sem reset ou descarte.
- CRM: lint, TypeScript, 10 testes e build de 44 rotas aprovados.
- Gateway: build e 3 testes aprovados; dependency audit sem vulnerabilidades.
- Gateway Render suspenso manualmente em 22/08/2026 antes do primeiro start válido no Back4App, evitando dois sockets concorrentes.
- Gateway Back4App Free implantado a partir da branch `sprint-b2-whatsapp-gateway`, com Dockerfile em `apps/whatsapp-gateway`; `/health` respondeu HTTP 200, `outboundReal: false` e aproximadamente 110 MB de RSS no limite de 256 MB.
- Sessão de teste foi restaurada no Back4App sem novo QR: uma sessão local `connected`, circuito fechado, zero tentativas de reconnect e `lastError` nulo.
- CRM de produção foi reimplantado com `WHATSAPP_GATEWAY_URL` apontando para o Back4App; o segredo permaneceu em ambiente protegido.
- Nova sessão de teste `dde0e967-d932-484d-ac71-827f41d49448` conectada por QR em 22/08/2026; Supabase confirmou auth state novo, heartbeat ativo, zero tentativas de reconnect, circuito fechado e nenhuma falha.
- Inbound real de texto, áudio, documento e vídeo persistido com identidade, mídia, eventos e auditoria.
- Imagem JPEG inbound real validada em 22/08/2026: objeto de 124.566 bytes no bucket privado `whatsapp-media`, `storageError` nulo, cliente/conversa vinculados, evento e auditoria persistidos e uma única mensagem por `providerMessageId`.
- Human Takeover e retorno para `AUTO` observados.
- Disconnect/reconnect controlado passou; falha simulada de Storage preservou mensagem, evento e auditoria sem duplicação.
- O domínio gratuito fornecido pelo Back4App foi explicitamente marcado no painel como temporário por 60 minutos. Portanto ele comprova portabilidade e restauração, mas não comprova runtime durável nem soak.
- Sprint B.2 permanece `NO-GO` para número comercial até validar perda física de rede, outbound allowlisted, URL/runtime permanente sem sleep e soak de 24 horas.
- Sprint C não foi iniciada.
