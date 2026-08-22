# Correção da jornada integrada do CRM

Atualizado em: 14/08/2026

## Estado de validação

- Build: aprovado após as alterações.
- Lint: reprovado pelos 17 erros preexistentes documentados em `PROJECT_STATE.md`; nenhum novo erro permanece após a revisão.
- Migração Supabase: aplicada com sucesso no projeto de produção `pdrvmdfqihnlzztsapwt` pelo SQL Editor autenticado.
- Teste integrado local: aprovado com o cliente de teste, incluindo transição, histórico, qualificação persistida, criação de compromisso e leitura nas centrais.
- Verificação visual local: Dashboard, Carteira, Funil, Análises, Fechamento, Agenda, Financeiro, Pós-venda e Clientes abriram sem erro; uma falha de atualização da lista de Análises foi encontrada e corrigida durante o teste.

## Etapa 1 — jornada, sincronização e rastreabilidade

- Criada operação transacional única `transition_client_journey`, que atualiza a ficha e grava a transição completa no histórico na mesma transação.
- Funil passou a consumir clientes persistidos; pesquisa aceita nome, telefone, etapa e situação.
- Links de prontuário apontam para `/clientes/[id]`.
- Próximas ações com data criadas na Carteira alimentam `appointments`, a fonte da Agenda geral.
- Ficha, funil e listas usam `updated_at`, etapas e próxima ação do mesmo registro de cliente.

## Etapa 2 — qualificação e documentação

- Resultado `Aguardando documentação` normalizado nas jornadas comercial e financeira.
- Resultado `Pasta recebida` incluído no atendimento.
- Qualificação ganhou persistência JSON na ficha única, sem estado duplicado entre telas.
- Anexos múltiplos continuam armazenados no Supabase Storage e consolidados em PDF; a ficha passou a oferecer visualização e exclusão.
- Upload de pasta para cliente aguardando documentos faz o encaminhamento automático.

## Etapa 3 — Central de Análises

- Incluídas as filas `Aguardando documentação` e `Documentação recebida`.
- Recebimento documental move o cliente para `Documentação recebida`, com histórico e próxima ação.
- Resultados `Restrição`, `Condicionado` e `Aprovado` são persistidos pela transição única; aprovação encaminha para Fechamento.
- Números fictícios do painel de análise foram removidos ou substituídos por contagens persistidas.

## Etapa 4 — Mesa de Fechamento

- Construtora e empreendimento permanecem encadeados pelo catálogo persistido.
- Bônus/desconto é calculado pela diferença entre valor cadastrado/importado e preço negociado.
- Quantidade de parcelas da TAC aceita qualquer inteiro positivo.
- Linhas sem valor são omitidas na proposta completa.
- Data e hora da proposta são geradas no momento real, no fuso de São Paulo.
- Dados escolhidos e calculados da proposta são preparados para persistência em `sales.proposal_data`.

## Etapa 5 — Dashboard e Carteira

- Dashboard e Carteira formam a Central diária com as subcentrais `Visão gerencial` e `Carteira operacional`.
- A metodologia operacional foi removida da Central de Análises.
- Indicadores da análise usam contagens persistidas; textos com percentuais e VGV fictícios foram removidos.
- O cliente de teste permanece com `data_quality = teste`, fora das métricas.
# Correções visuais e operacionais — 15/08/2026

- Funil: passou a consumir `/api/funnel`, que admite somente clientes com tentativas registradas ou atividade comprovada da jornada; a base total não é mais classificada automaticamente como prospecção.
- Dashboard/Carteira: removido o seletor duplicado; a navegação lateral volta a ser a única navegação entre as centrais.
- Agenda: compromissos redesenhados como cartões escuros, com faixa de etapa, hierarquia tipográfica e estados sem blocos amarelos ilegíveis.
- Mesa de fechamento: textarea escuro e opções de desfecho com estado ativo dourado/preto.
- Ficha única: rolagem normal restaurada; cabeçalho deixa de prender o conteúdo; anexos recebem ações compactas de visualizar/excluir.
- Pós-venda: evidências ampliadas e reorganizadas visualmente.
- Construtoras: ações secundárias padronizadas e regiões da construtora e do empreendimento apresentadas em sete caixas de seleção.
- CCA: coluna persistida `cca_partners.analysts text[]` e interface para adicionar/remover vários analistas.
- Indicadores: links operacionais deixam de herdar roxo do navegador e seguem dourado/preto do CRM.

Validação: build local e remoto aprovados; inspeção funcional em produção confirmou 3 clientes elegíveis no funil para 4.388 registros totais, 4 compromissos legíveis na agenda, rolagem da ficha até `scrollY=700`, sete regiões clicáveis, campo de analista e contraste correto no fechamento/indicadores. O lint mantém 17 erros e 11 avisos preexistentes de hooks React, sem erro novo desta rodada.
