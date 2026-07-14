# BLUEPRINT — DNA CRM 2.0
## O Sistema Operacional Comercial da DNA Imóveis

**Documento de rearquitetura completa · Versão 1.0 · 10/07/2026**
**Status: AGUARDANDO APROVAÇÃO — nenhuma linha de código será escrita antes do "aprovado" de Franklin Monteiro.**

Equipe responsável (papéis assumidos nesta entrega): Product Owner especialista em CRM Imobiliário · CTO · UX/UI Designer Sênior · Especialista em Gestão Comercial · Especialista em BI e Dashboards · Arquiteto de Software · Desenvolvedor Full Stack.

---

# PARTE 0 — SUMÁRIO EXECUTIVO

O sistema atual (MVP 1-8, em produção em dna-crm-ruby.vercel.app) provou o **motor**: o banco de dados, as regras de negócio, os gatilhos automáticos de produção e a segurança funcionam e estão testados. O que ele **não** entrega é a **experiência**: hoje é um conjunto de formulários e listas — não um sistema operacional comercial. Um gerente não consegue responder "quem precisa de ajuda?" em 10 segundos. Um corretor não abre o sistema de manhã sabendo exatamente o que fazer.

O DNA CRM 2.0 é reconstruído em cima de um conceito único:

> **O corretor abre o app e o app diz o que fazer. O gerente abre o app e o app diz onde está o problema.**

Este Blueprint contém: (1) auditoria crítica e sem defesa do que existe; (2) o projeto do produto ideal; (3) a especificação profissional de **42 telas em 18 módulos**, sem nada implícito; (4) os pontos em que **questionamos as suas decisões**, como uma software house de verdade faz; (5) o roadmap de reconstrução em fases.

**Estratégia de reconstrução (importante):** "esquecer o sistema atual" vale para o produto e para as telas — não para o alicerce. O banco de dados, as migrações 0001-0014, os triggers de produção automática, o RLS e os 67 testes continuam valendo como fundação, porque foram desenhados a partir das planilhas da DNA (fonte oficial de verdade) e já rodam em produção com dados reais do piloto. Jogar isso fora seria queimar dinheiro. **Reconstruímos 100% da camada de experiência e ~30% da camada de dados (novas entidades); preservamos ~70% do motor.** Conforme sua instrução: as alterações já realizadas ficam mantidas.

---

# PARTE 1 — AUDITORIA CRÍTICA DO SISTEMA ATUAL

Análise fria, tela por tela, do que foi entregue nos MVPs 1-8 e nos ajustes do piloto. Sem defesa.

## 1.1 O que ficou bom (e será preservado como fundação)

1. **O motor de produção automática é a alma certa.** Registrar uma triagem credita ligação/WhatsApp; completar a pasta credita "pasta"; tudo via trigger no banco, sem preenchimento duplicado. Essa é a filosofia do projeto funcionando de verdade — nenhum CRM de prateleira faz isso no padrão DNA.
2. **A triagem de atendimento espelha o processo real.** O fluxo origem → nome/telefone → "seguiu?" → cadastro ou motivo replica o Controle de Atendimentos que a equipe já usa. Adoção sem treinamento.
3. **A pasta digital ficou operacional.** Checklist essencial (identificação + renda + endereço), foto pela câmera, envio múltiplo com identificação por arquivo, seção de dependentes com grau de parentesco. É o módulo mais maduro do sistema.
4. **Segurança e auditoria de nível profissional.** RLS em todas as tabelas (admin tudo / dono os seus / gerente da equipe), histórico automático de ações, exclusão lógica, bucket privado com URL assinada. LGPD respeitada desde o dia 1.
5. **Qualidade de engenharia.** 67 testes unitários + 11 suítes de teste de banco, migrações idempotentes, deploy contínuo. A base não quebra.
6. **Funil oficial respeitado** e qualificação enxuta ajustada pelo piloto (renda em R$, checkboxes de CLT/dependentes, nascimento em vez de CPF).

## 1.2 O que ficou ruim

1. **A tela inicial do corretor é um checklist, não um cockpit.** Mostra números do dia, mas não diz *o que fazer agora*. Não há fila de trabalho, não há "próximas 5 ações", não há plano do dia.
2. **O Painel da Gestão é uma tabela.** Foi entregue às pressas na correção do piloto: uma tabela de feito/meta e barras de funil. Não responde nenhuma das 10 perguntas de gestão que você listou (quem está parado? qual etapa trava? qual a projeção do mês?). É exatamente o tipo de "tabela simples" que você proibiu.
3. **Não existe visão Kanban do pipeline.** O funil só existe como lista com filtro de etapa. Arrastar cliente entre etapas — o gesto universal de todo CRM decente — não existe.
4. **Navegação improvisada.** Um header com 3 links + um botão flutuante. Sem barra inferior no mobile (padrão de mercado), sem sidebar no desktop, sem busca global. Com 18 módulos isso colapsa.
5. **Zero gráficos de verdade.** Barras CSS no funil da gestão. Sem tendência, sem comparativo, sem heatmap, sem evolução mensal. Um sistema que promete BI não tem um único gráfico temporal.
6. **Visual genérico.** Navy + dourado aplicados sobre componentes crus. Não parece um produto; parece um protótipo funcional (que é o que era — mas você pediu a crítica).
7. **Registro de atividade é burocrático.** O corretor que fez 30 ligações precisa registrar uma a uma pelo FAB. Falta o "modo turbo": fila de prospecção com registro em 1 toque.

## 1.3 O que está faltando (módulos inteiros)

| Módulo | Situação atual |
|---|---|
| Empreendimentos | **Não existe como entidade.** É um campo de texto no cliente. Sem tabela de unidades, sem conversão por produto. |
| Ranking / Gamificação | Não existe. |
| Comissões | Regra calculada em biblioteca, **sem tela nenhuma**. |
| Financeiro (VGV, recebíveis, repasses) | Não existe. |
| Relatórios / Exportação | Não existe. Gerente não extrai nada para reunião. |
| IA / Inteligência operacional | Alertas do MVP-8 são listas estáticas; não há detecção de gargalo, projeção, nem sugestão de ação. |
| Pós-venda estruturado | É só uma etapa do funil, sem esteira (assinatura → ITBI → chaves) nem régua de indicações. |
| Configurações / metas configuráveis | Metas fixas no código. Trocar meta = deploy. |
| Gestão de equipes | Campo gerente_id no banco, sem tela de estrutura de equipe. |
| Feirões | KPI previsto (10 comparecimentos feirão) **sem nenhum registro possível na interface**. |

## 1.4 O que está poluído

1. **Cadastro do cliente em uma página única e comprida** — qualificação, cônjuge e interesse empilhados. No celular, é rolagem infinita.
2. **Tela de documentos com 4 seções empilhadas** (checklist + upload + enviados + dependentes) — funciona, mas o corretor rola demais; dependentes deveria ser aba ou sub-tela.
3. **Dropdown de documentos com "CPF (avulso)"** convivendo com "RG e CPF" — resquício da fusão, confunde.
4. **Textos de sistema vazando para o usuário** ("exclusão lógica", mensagens técnicas de erro).

## 1.5 O que não agrega valor (hoje)

1. Página **/perfil** — mostra nome e botão sair. Nada acionável.
2. Registro manual de follow-up sem vínculo obrigatório com cliente — gera número de KPI sem gerar rastreabilidade.
3. Campo "status_validacao" dos documentos — existe no banco e na tela, mas ninguém valida documento no fluxo atual (sem papel de validador definido).

## 1.6 O que deveria existir (e passa a existir neste Blueprint)

1. **Central de Operações** como tela inicial (Parte 3, T-01/T-02) — não um dashboard: um centro de comando.
2. **Fila de trabalho inteligente** para o corretor ("suas próximas 10 ações, em ordem").
3. **Kanban do pipeline** com arrastar-e-soltar e SLA por etapa.
4. **Motor de inteligência** com score de saúde por cliente, por corretor e por etapa + projeção de fechamento do mês.
5. **Empreendimento como entidade central** — todo cliente aponta para um produto; toda conversão é medida por produto.
6. **Ranking com gamificação** (pontos, sequências, ligas mensais).
7. **Comissões transparentes** para o corretor e consolidadas para a gestão.
8. **Modo Feirão** — evento com check-in de comparecimentos em massa.
9. **Relatórios exportáveis** (PDF para reunião, Excel para análise).
10. **Metas configuráveis** por perfil, por corretor e por período, com histórico.

## 1.7 O que deve ser removido

1. A tabela crua do Painel da Gestão (substituída pela Torre de Controle, T-15).
2. "CPF (avulso)" do dropdown de documentos.
3. A página /perfil atual (absorvida por Configurações > Minha Conta).
4. Duplicidade de fluxos de upload (fluxo antigo de 1 arquivo convive com o múltiplo — fica só o múltiplo).
5. Qualquer texto técnico visível ao usuário.

## 1.8 Veredicto

O sistema atual é um **excelente MVP de motor** e um **produto fraco de experiência**. Nota como fundação técnica: 8/10. Nota como sistema operacional comercial: 3/10. A reconstrução certa não é jogar fora — é **trocar a carroceria inteira mantendo o motor**, e adicionar os 10 módulos que faltam.

---

# PARTE 2 — O PRODUTO IDEAL

## 2.1 Conceito: Sistema Operacional Comercial

O DNA CRM 2.0 não é um lugar onde se *guarda* informação. É o lugar de onde se *opera* o dia. Três leis de produto governam tudo:

**Lei 1 — O sistema fala primeiro.** Nenhuma tela abre vazia esperando o usuário decidir. Toda tela abre respondendo: "o que você precisa fazer/saber agora?". Para o corretor: a próxima ação. Para o gerente: o próximo problema.

**Lei 2 — Registrar custa no máximo 2 toques.** Toda ação comercial (ligação, WhatsApp, follow-up, agendamento, comparecimento) é registrada em até 2 toques a partir de qualquer tela. Se custa mais que isso, o corretor não registra, e o dado morre.

**Lei 3 — Um dado, mil leituras.** Cada registro alimenta simultaneamente: produção diária, funil, ranking, dashboards, comissão projetada, alertas, histórico do cliente e projeção do mês. Nunca se digita duas vezes.

## 2.2 Personas e jornadas diárias

### O dia do CORRETOR (persona: Renan, 26, celular na mão, no plantão)

- **7h50 — abre o app.** Tela "Hoje": anel de progresso das metas zerado, e o **Plano do Dia** já montado pelo sistema: 3 clientes com follow-up vencendo, 1 visita agendada às 10h, 2 clientes esquecidos há 5+ dias, e a fila de prospecção com os leads mais quentes no topo.
- **8h-12h — Modo Turbo.** Entra na fila de prospecção: o sistema mostra um cliente por vez (nome, telefone com botão de ligar/WhatsApp, último contato, empreendimento de interesse). Cada ligação encerrada = 1 toque no desfecho (atendeu / não atendeu / agendou / descartar). O contador de ligações sobe sozinho. 80 ligações sem digitar nada além de desfechos.
- **10h — visita.** O app notifica 30 min antes. Ao concluir, 1 toque: "Compareceu". O KPI credita, o cliente avança no funil se for o caso, e o sistema já sugere: "criar tarefa de análise de crédito?".
- **14h — pasta.** Fotografa os documentos do cliente aprovado na visita. Checklist fecha, "1 pasta" credita, gerente recebe o sinal.
- **18h — fecha o dia.** Resumo automático: "Hoje: 82 ligações ✅, 43 WhatsApps ✅, 18 follow-ups (faltaram 2), 1 pasta ✅. Você subiu para 3º no ranking. Amanhã seu plano já tem 12 ações."

### O dia do GERENTE (persona: Carla, gerencia 8 corretores)

- **8h — abre a Central de Operações.** Em 10 segundos ela vê: **semáforo da operação** (verde/amarelo/vermelho), 2 corretores em vermelho (produção < 50% ontem), 14 clientes esquecidos na equipe, funil travado em Análise (9 clientes há 4+ dias), projeção do mês: 2,4 vendas no ritmo atual — **abaixo da meta de 3**.
- **8h10 — age.** Toca no corretor vermelho → vê o raio-X dele → manda mensagem pelo próprio card. Toca no gargalo de Análise → vê os 9 clientes → redistribui 3.
- **17h — reunião.** Exporta o relatório semanal em PDF direto da Central. Sem planilha manual.

### O dia do ADMINISTRADOR (persona: Franklin)

- Vê tudo da Carla, para todas as equipes, mais: VGV consolidado, comissões a pagar/receber, conversão por empreendimento e por construtora, configuração de metas, usuários e integrações.

## 2.3 Arquitetura de navegação (mobile-first)

### Smartphone — barra inferior fixa com 5 itens

| Posição | Item | Leva a |
|---|---|---|
| 1 | 🏠 Hoje | Central de Operações do perfil |
| 2 | 👥 Clientes | Lista/Kanban de clientes |
| 3 | ➕ **Registrar** (botão central destacado, dourado) | Folha de registro rápido (2 toques) |
| 4 | 📅 Agenda | Agenda do dia/semana |
| 5 | ☰ Menu | Todos os 18 módulos, busca global, conta |

Regra: **os 4 destinos que resolvem 90% do dia do corretor estão a 1 toque**. Todo o resto (dashboards, ranking, comissões, relatórios, admin) vive no Menu — organizado por seções, com os itens visíveis conforme o perfil.

### Tablet — mesma barra inferior + painéis em 2 colunas (lista à esquerda, detalhe à direita).

### Desktop — sidebar fixa à esquerda com os módulos agrupados:

- **OPERAÇÃO**: Hoje · Clientes · Pipeline · Agenda · Produção
- **GESTÃO** (gerente+): Torre de Controle · Dashboards · Ranking · Relatórios
- **NEGÓCIO**: Empreendimentos · Comissões · Financeiro · Pós-venda
- **SISTEMA** (admin): Usuários · Configurações · Administração
- Topo: busca global (Ctrl+K) · sino de alertas · avatar.

### Busca global
De qualquer tela: buscar cliente (nome/telefone), empreendimento, corretor. Resultado em painel flutuante com ação direta (ligar, abrir ficha, WhatsApp).

## 2.4 Design System "DNA"

- **Cores**: Navy #0B1F3A (estrutura), Dourado #C9A227 (ação/destaque), Prata #C0C7D1 (secundário), fundo claro #F7F8FA. Semáforo operacional: verde #16A34A, âmbar #D97706, vermelho #DC2626 — usados APENAS para estado de performance, nunca decoração.
- **Tipografia**: uma família (Inter), 4 tamanhos, números em *tabular* nos KPIs.
- **Componentes canônicos** (todo o sistema usa só estes): Card KPI (valor + meta + tendência ↑↓), Anel de progresso, Barra de meta, Kanban card, Linha de ranking (posição + avatar + pontos + variação), Heatmap célula, Timeline item, Alerta acionável (texto + botão de ação), Gráfico de linha/coluna/funil (biblioteca única), Chip de filtro, Folha inferior (bottom sheet) para ações mobile.
- **Estados obrigatórios** em toda tela: carregando (esqueleto), vazio (com instrução do que fazer), erro (com ação de recuperação). Nunca tela branca.
- **Acessibilidade**: alvos de toque ≥ 44px, contraste AA, tudo operável com uma mão no celular.

## 2.5 Motor de Inteligência Operacional (o "cérebro")

Não é IA generativa solta — é um motor de regras + estatística sobre os dados que o CRM já coleta sozinho, com três camadas:

### Camada 1 — Scores (recalculados a cada evento)
- **Saúde do cliente (0-100)**: recência do último contato, existência de próxima ação, tempo na etapa vs. mediana, pasta completa, resposta a contatos. <40 = "esquecendo"; <20 = "esquecido" (alerta).
- **Ritmo do corretor (0-100)**: produção do dia vs. meta ponderada por hora do dia (50% da meta às 12h = no ritmo), tendência de 7 dias, conversão pessoal.
- **Fluidez da etapa (0-100)**: tempo médio dos clientes na etapa vs. referência histórica. Queda = gargalo detectado.

### Camada 2 — Detecções automáticas (o sistema anuncia, ninguém pergunta)
| Detecção | Regra | Quem recebe |
|---|---|---|
| Cliente esquecido | sem interação registrada há N dias (config; padrão 5) e sem próxima ação | corretor + gerente |
| Corretor parado | 0 registros até 11h ou <30% da meta às 14h | gerente |
| Gargalo de funil | etapa com fluidez <50 por 3 dias | gerente + admin |
| Queda de conversão | conversão da semana <70% da média das 8 anteriores (por corretor/etapa/empreendimento) | gerente |
| Documento pendente | pasta incompleta há 3+ dias após entrada em Análise | corretor |
| Análise atrasada | cliente em Análise há mais que o SLA da etapa | corretor + gerente |
| Meta em risco | projeção do mês <90% da meta no dia 15+ | gerente + admin |

### Camada 3 — Projeção e recomendação
- **Projeção de vendas do mês**: ritmo atual (vendas + aprovados ponderados pela conversão histórica Aprovados→Fechamento) extrapolado pelos dias úteis restantes. Exibida com faixa (pessimista/provável/otimista).
- **Plano do Dia do corretor**: fila ordenada por urgência (follow-ups vencidos → agendamentos → clientes esquecendo → leads quentes sem contato → prospecção).
- **Assistente DNA (módulo IA)**: resumo em linguagem natural da operação, resposta a perguntas ("quem converte melhor no Reserva das Águas?"), rascunho de mensagem de follow-up. Sempre sobre dados do CRM, nunca inventando números.

## 2.6 Regras transversais (valem para o sistema inteiro)

1. **Pipeline imutável**: Novo Lead → Contatos → Análise → Restrições → Condicionados → Aprovados → Fechamentos → Pós-venda. Agendamento e comparecimento são **eventos** dentro das etapas (registram KPI), não etapas.
2. Toda mudança de etapa exige **motivo quando regride** e registra histórico automático (usuário, data/hora, de→para).
3. Todo cliente deve ter **sempre uma próxima ação** com data. Ao concluir uma, o sistema pede a próxima (ou sugere).
4. **SLA por etapa** (configurável): Novo Lead 24h sem contato = alerta; Contatos 7d; Análise 5d; Restrições 15d; Condicionados 10d; Aprovados 30d.
5. Permissões: corretor vê o seu; gerente vê a equipe; admin vê tudo. Em TODAS as telas de gestão existe o filtro Equipe/Corretor/Período.
6. Períodos padrão em todo dashboard: Hoje · Semana · Mês · Mês anterior · Personalizado.
7. Horário comercial e dias úteis configuráveis (afetam SLA e projeções).

---

# PARTE 3 — ESPECIFICAÇÃO COMPLETA DAS TELAS (18 MÓDULOS · 42 TELAS)

Convenções: **[C]** visível ao corretor · **[G]** gerente · **[A]** admin. Toda tela herda: estados de carregando/vazio/erro, busca global, sino de alertas e a navegação da Seção 2.3. "Registrar" (2 toques) está disponível em todas.

---

## MÓDULO 1 — CRM / CENTRAL DE OPERAÇÕES

### T-01 · Hoje — Cockpit do Corretor [C]
- **Objetivo**: em 5 segundos o corretor sabe como está o dia dele e qual é a próxima ação.
- **Componentes**: (a) Saudação + data + posição no ranking com variação ("3º ↑1"); (b) **Anel de progresso do dia** (% ponderado da meta diária) com semáforo; (c) 7 mini-cards de KPI: ligações, WhatsApps, follow-ups, agendamentos, comparecimentos, pastas, feirão — cada um "feito/meta" com barra; (d) **Plano do Dia**: lista ordenada de ações (cliente, tipo de ação, motivo, botões ligar/WhatsApp/concluir); (e) faixa "Próximo compromisso" (da agenda); (f) alertas pessoais (clientes esquecendo, documentos pendentes); (g) card "Comissão projetada do mês".
- **Botões/Ações**: iniciar Modo Turbo (botão dourado grande); concluir item do plano (1 toque + desfecho); adiar item (escolhe nova data); abrir cliente.
- **Filtros**: nenhum — a tela é o filtro (só o hoje do corretor).
- **Indicadores**: % da meta do dia; sequência de dias batendo meta ("🔥 4 dias"); pontos do dia.
- **Regras**: plano do dia recalcula a cada evento; itens vencidos sobem com selo vermelho; às 18h o card vira "Resumo do dia".

### T-02 · Hoje — Central de Operações do Gerente [G/A]
- **Objetivo**: responder em 10 segundos: como está a operação, quem precisa de ajuda, o que trava, e se a meta do mês vem.
- **Componentes** (ordem vertical mobile / grade 3 colunas desktop):
  1. **Semáforo da operação**: um card-status gigante (VERDE operação no ritmo / ÂMBAR atenção / VERMELHO intervenção) calculado do ritmo agregado + alertas críticos.
  2. **Projeção do mês**: vendas realizadas + projeção (faixa) vs. meta, com gráfico de linha do acumulado do mês vs. mês anterior.
  3. **Equipe agora**: heatmap corretores × KPIs do dia (célula verde/âmbar/vermelho por % da meta pro-rata da hora). Toque na célula → raio-X do corretor (T-16).
  4. **Quem precisa de ajuda**: cards dos corretores em vermelho, com motivo ("0 ligações até 11h") e botão "chamar no WhatsApp".
  5. **Funil vivo**: funil gráfico com contagem por etapa + selo de gargalo na etapa travada.
  6. **Clientes em risco**: contador de esquecidos da equipe + lista dos 5 piores (dias sem contato) com responsável.
  7. **Feed de conquistas**: pastas completadas, aprovações e vendas do dia, em tempo quase real.
- **Botões/Ações**: redistribuir cliente (arrastar para outro corretor ou menu); exportar resumo do dia (PDF); acionar corretor.
- **Filtros**: equipe (se admin: todas/uma), período fixo hoje (histórico fica nos Dashboards).
- **Indicadores**: ritmo agregado %; nº alertas críticos; VGV do mês; conversão do mês.
- **Regras**: semáforo = vermelho se (≥2 corretores <30% do pro-rata) OU (gargalo crítico) OU (projeção <70% da meta após dia 10); atualização automática a cada 60s.

### T-03 · Busca Global [C/G/A]
- **Objetivo**: achar qualquer coisa em ≤2s e agir dali mesmo.
- **Componentes**: campo único; resultados agrupados (Clientes, Empreendimentos, Corretores, Ações do sistema); cada cliente com telefone, etapa e botões ligar/WhatsApp/abrir.
- **Regras**: busca por nome parcial e telefone (com/sem máscara); respeita permissões; histórico das 5 últimas buscas.

---

## MÓDULO 2 — CLIENTES

### T-04 · Lista de Clientes [C/G/A]
- **Objetivo**: encontrar e priorizar clientes da carteira.
- **Componentes**: alternador **Lista ⇄ Kanban** (Kanban = T-09); cards de cliente: nome, telefone (ligar/WhatsApp direto), etapa (chip colorido), empreendimento, **score de saúde** (anel 0-100), próxima ação + data (vermelha se vencida), responsável (gerente+).
- **Botões/Ações**: ➕ Novo atendimento (abre triagem T-06); ações rápidas no card (registrar contato, agendar, mover etapa); seleção múltipla (gerente): redistribuir, exportar.
- **Filtros** (chips): etapa · empreendimento · origem (Lead/Listas/Indicação/Carteira) · saúde (todos/esquecendo/esquecidos) · próxima ação (hoje/vencida/sem ação) · corretor (gerente+) · ordenação (saúde ↑, última interação, criação).
- **Indicadores**: total filtrado; nº sem próxima ação (badge de alerta).
- **Regras**: padrão = ordenado por urgência (vencidos primeiro); cliente sem próxima ação exibe selo "⚠ definir ação"; paginação infinita.

### T-05 · Ficha do Cliente 360° [C/G/A]
- **Objetivo**: TUDO sobre o cliente em uma tela; nenhuma pergunta do gerente fica sem resposta aqui.
- **Componentes**: cabeçalho (nome, telefone com ações, etapa atual com botão "mover", score de saúde, responsável, empreendimento de interesse); barra de progresso do funil (8 etapas, atual destacada, tempo em cada uma no hover/toque); **abas**: `Resumo` (próxima ação editável, qualificação — renda, FGTS, 3+ anos CLT, dependentes, nascimento/idade, região e forma de renda —, cônjuge, observações fixadas), `Timeline` (linha do tempo vertical com TODOS os eventos automáticos: contatos, mudanças de etapa, documentos, agendamentos, com autor e hora), `Documentos` (=T-08 embutida), `Proposta` (simulador de fluxo de pagamento + PDF — já existente, reaproveitado), `Pós-venda` (aba visível a partir de Fechamento).
- **Botões/Ações**: registrar contato (2 toques); agendar; mover etapa (bottom sheet com as etapas válidas + motivo se regressão); transferir responsável (gerente); arquivar (com motivo).
- **Indicadores**: dias na etapa atual vs. SLA (barra); score de saúde com explicação ("sem contato há 6 dias").
- **Regras**: mover para Fechamentos exige empreendimento + unidade + valor (dispara comissão e VGV); mover para Aprovados exige pasta completa (bloqueio suave: pede confirmação do gerente se incompleta); timeline é imutável.

### T-06 · Novo Atendimento — Triagem [C]
- **Objetivo**: registrar TODO atendimento em <30s, mesmo os que não viram cadastro (mantida do sistema atual — aprovada no piloto).
- **Componentes**: passo 1: origem (Lead/Listas/Indicação/Carteira) + nome + telefone + nº de tentativas; passo 2: "Seguiu atendimento?" SIM/NÃO; NÃO → motivo (7 opções) e encerra creditando os KPIs; SIM → cadastro T-07 pré-preenchido.
- **Regras**: telefone com dedupe (avisa se já existe cliente/lead com o número e oferece abrir); tentativas creditam ligações/WhatsApps na produção automaticamente.

### T-07 · Cadastro / Qualificação [C]
- **Objetivo**: qualificar sem fricção — agora em **3 passos curtos** (correção da poluição atual).
- **Componentes**: passo 1 `Contato` (nome, telefone, e-mail opcional, origem herdada); passo 2 `Qualificação` (renda R$ automática, FGTS R$, "3+ anos de carteira assinada?" ✓, "possui dependentes?" ✓, nascimento, forma de renda, cônjuge compõe renda? → se sim, mini-form do cônjuge); passo 3 `Interesse` (empreendimento — seletor do catálogo, região, observação). Barra de progresso 1-2-3.
- **Regras**: só nome+telefone são obrigatórios para salvar (qualificação pode completar depois — o sistema cria próxima ação "completar qualificação"); idade calculada e exibida com aviso se >64 (condicionante de financiamento).

### T-08 · Pasta Digital / Documentos [C/G]
- **Objetivo**: completar a pasta no menor tempo possível (evolução da tela atual, aprovada no piloto).
- **Componentes**: checklist essencial no topo (Identificação RG+CPF ou CNH · Renda · Endereço) com % e selo "PASTA COMPLETA em dd/mm"; botões `📷 Tirar foto` e `📁 Escolher arquivos` (múltiplos, identificação por arquivo); **abas `Titular` / `Cônjuge` / `Dependentes`** (dependentes com grau de parentesco obrigatório até 3º grau — mantido); lista de enviados com "Ver ↗" (nova aba) e remover.
- **Regras**: pasta completa credita KPI e notifica gerente (mantidas); documento de dependente nunca conta para a pasta do titular (mantida); some o tipo "CPF avulso".

---

## MÓDULO 3 — PIPELINE

### T-09 · Kanban do Funil [C/G/A]
- **Objetivo**: visão espacial do funil com movimentação por arrastar.
- **Componentes**: 8 colunas fixas (pipeline oficial), cabeçalho de coluna com contagem + VGV potencial + tempo médio; cards: nome, empreendimento, saúde, dias na etapa (fica âmbar/vermelho ao estourar SLA), responsável (avatar, gerente+); no mobile: colunas em carrossel horizontal com "pinça" para visão geral.
- **Botões/Ações**: arrastar card entre colunas (mesmas validações da T-05); toque = abre ficha; ➕ na coluna Novo Lead = triagem.
- **Filtros**: corretor/equipe (gerente+), empreendimento, origem, período de entrada.
- **Indicadores**: conversão entre colunas adjacentes (setinha com % entre cabeçalhos); selo 🔥 gargalo na coluna com fluidez <50.
- **Regras**: pipeline IMUTÁVEL (não cria/renomeia/exclui coluna, nem o admin); regressão exige motivo; arrastar para Fechamentos abre o formulário de venda.

### T-10 · Análise do Funil [G/A]
- **Objetivo**: responder "qual etapa trava mais?" e "onde perdemos clientes?".
- **Componentes**: funil gráfico com taxas etapa-a-etapa; gráfico de **tempo médio por etapa** (barras horizontais vs. SLA); tabela de perdas por etapa e motivo (dos arquivamentos); comparativo entre dois períodos lado a lado.
- **Filtros**: período, equipe, corretor, empreendimento, origem.
- **Regras**: cada número é clicável e abre a lista de clientes que o compõem (transparência total do BI).

---

## MÓDULO 4 — AGENDA

### T-11 · Agenda [C/G/A]
- **Objetivo**: nenhuma visita perdida, nenhum follow-up esquecido.
- **Componentes**: visões Dia (padrão mobile) / Semana / Mês; itens coloridos por tipo (visita, follow-up, feirão, reunião, análise); cada item: hora, cliente (link), local, status (pendente/realizado/faltou); gerente+ vê agenda consolidada da equipe com filtro por corretor.
- **Botões/Ações**: ➕ novo compromisso (T-12); concluir com desfecho em 1 toque: visita → "Compareceu / Não compareceu / Remarcou" (credita comparecimento e propõe registrar próximo passo).
- **Indicadores**: taxa de comparecimento da semana; compromissos sem desfecho (badge).
- **Regras**: notificação 30 min antes; item vencido sem desfecho vira pendência no Plano do Dia; concluir "Compareceu" credita KPI automaticamente.

### T-12 · Novo Compromisso [C/G]
- **Componentes**: tipo, cliente (busca), data/hora, local (texto ou empreendimento), lembrete. 5 campos, uma tela.
- **Regras**: agendamento de visita credita KPI "agendamento" no ato; conflito de horário gera aviso (não bloqueio).

---

## MÓDULO 5 — PRODUÇÃO

### T-13 · Minha Produção [C] / Produção da Equipe [G/A]
- **Objetivo**: prestação de contas transparente — o corretor vê exatamente o que a gestão vê.
- **Componentes**: seletor Dia/Semana/Mês; os 7 KPIs em cards com barra de meta; **gráfico de linhas dos últimos 30 dias** (qualquer KPI selecionável); heatmap calendário (estilo GitHub: cada dia uma célula colorida pelo % da meta); tabela de registros (fonte: histórico automático) com origem de cada crédito; versão gerente: mesmo layout agregado + quebra por corretor.
- **Indicadores**: média diária; melhor dia; sequência atual; % do mês.
- **Regras**: nenhum registro manual aqui — a tela é 100% leitura do que os fluxos creditam; discrepâncias contestáveis via "sinalizar" (abre pendência para o gerente).

### T-14 · Modo Turbo — Fila de Prospecção [C]
- **Objetivo**: transformar as 80 ligações diárias em uma esteira de 1 toque por desfecho.
- **Componentes**: tela cheia, um contato por vez: nome, telefone gigante, empreendimento de interesse, último contato, script sugerido (colapsável); botões: `📞 Ligar` e `💬 WhatsApp` (abrem discador/app); desfechos em botões grandes: `Atendeu — interessado` / `Atendeu — sem interesse` / `Não atendeu` / `📅 Agendou` / `Número errado`; contador de sessão no topo ("Ligações: 23 · Meta 80").
- **Filtros de fila**: leads novos sem contato → follow-ups do dia → carteira fria (ordenação automática do motor; corretor pode escolher fila).
- **Regras**: cada desfecho credita ligação/WhatsApp e grava na timeline; "Agendou" abre T-12 pré-preenchida; "sem interesse" pergunta motivo (2 toques) e move para arquivado; fila nunca repete cliente no mesmo dia.

### T-15b · Modo Feirão [C/G]
- **Objetivo**: registrar comparecimentos em massa em eventos (KPI de 10 comparecimentos feirão hoje não tem como ser registrado — falha grave corrigida).
- **Componentes**: gerente cria o evento (nome, data, empreendimentos); durante o evento, corretor tem botão gigante `+1 Comparecimento` com busca rápida do cliente (ou cadastro-relâmpago nome+telefone); placar ao vivo do evento por corretor.
- **Regras**: comparecimento de feirão credita o KPI específico; cadastros-relâmpago entram como Novo Lead com origem "Feirão <nome>".

---

## MÓDULO 6 — GESTÃO

### T-15 · Torre de Controle da Equipe [G/A]
- **Objetivo**: substituir a tabela atual por uma sala de comando que responde as 10 perguntas de gestão.
- **Componentes**:
  1. **Heatmap Equipe × KPI** (linhas = corretores, colunas = 7 KPIs + % geral; células com semáforo pelo % da meta; período selecionável Dia/Semana/Mês).
  2. **Painel "Perguntas da Gestão"** — cards prontos, um por pergunta: *Quem está abaixo da meta?* (lista vermelha) · *Quem vende mais?* (top 3 vendas/VGV) · *Quem produz mais?* (top 3 atividades) · *Quem está parado?* (sem registro nas últimas 2h úteis) · *Quem tem clientes esquecidos?* (contagem por corretor) · *Qual etapa trava?* (gargalo com dias) · *Qual empreendimento converte melhor?* (top 3 %) · *Qual corretor converte melhor?* (top 3 %) · *Quanto falta para a meta?* (vendas restantes + dias úteis) · *Projeção do mês?* (faixa).
  3. Linha do tempo da equipe (últimos eventos relevantes).
- **Botões/Ações**: cada card abre a lista-detalhe; acionar corretor; exportar (PDF/Excel).
- **Filtros**: equipe (admin), período, KPI.
- **Regras**: todos os números clicáveis até o nível do cliente/registro; heatmap pro-rata da hora no modo Dia.

### T-16 · Raio-X do Corretor [G/A]
- **Objetivo**: decidir em 1 minuto se o corretor precisa de treino, cobrança ou reconhecimento.
- **Componentes**: cabeçalho (foto, equipe, ranking, sequência); produção mês (7 KPIs vs. meta); **funil individual** com conversões etapa-a-etapa vs. média da equipe (as diferenças em destaque: "converte 12% em Análise vs. 24% da equipe → gargalo de qualificação"); carteira (nº clientes por etapa, esquecidos, sem próxima ação); histórico de vendas e comissões; evolução 6 meses (linhas).
- **Botões/Ações**: ajustar meta individual (T-21); transferir clientes; registrar feedback 1:1 (nota privada do gerente).
- **Regras**: comparação sempre com a média da equipe no mesmo período; acesso restrito a gerente do corretor e admin.

### T-17 · Distribuição de Leads [G/A]
- **Objetivo**: nenhum lead parado; distribuição justa e estratégica.
- **Componentes**: fila de leads não atribuídos (origem, chegada, tempo esperando — SLA 24h com semáforo); painel de rodízio: modo `Manual` / `Rodízio automático` / `Por performance` (pesos por conversão); carga atual por corretor (nº clientes ativos).
- **Botões/Ações**: atribuir (arrastar ou 1 toque); pausar corretor no rodízio (férias/plantão); regras de exceção por empreendimento.
- **Regras**: lead >24h sem atribuição = alerta vermelho ao gerente; toda atribuição notifica o corretor e cria próxima ação "1º contato hoje".

---

## MÓDULO 7 — DASHBOARDS

### T-18 · Dashboard Comercial (mensal) [G/A]
- **Objetivo**: a fotografia executiva do mês em uma tela.
- **Componentes**: cards-resumo (Vendas vs. meta 3 · VGV · Comissões geradas · Conversão geral · Comparecimentos 30 · Aprovações 10); gráfico de colunas *vendas por mês* (12 meses); linha *acumulado do mês vs. mês anterior vs. meta*; pizza/rosca *origem dos negócios fechados*; ranking compacto top 5; **comparativo corretor × corretor** (selecionar 2-4 e sobrepor linhas).
- **Filtros**: mês/ano, equipe, empreendimento.
- **Regras**: exportável em PDF de 1 página (reunião de resultados); metas finais oficiais fixas no cabeçalho (30 comparecimentos · 10 aprovações · 3 vendas).

### T-19 · Dashboard de Conversão [G/A]
- **Objetivo**: onde o dinheiro vaza.
- **Componentes**: funil completo com % etapa-a-etapa e benchmark interno (média 6 meses); **heatmap corretor × etapa** (conversão de cada corretor em cada transição — revela exatamente quem trava onde); curva tempo-até-venda (dias da triagem ao fechamento, mediana); motivos de perda ranqueados.
- **Regras**: célula do heatmap abre os clientes daquela transição; períodos comparáveis lado a lado.

### T-20 · Dashboard de Empreendimentos [G/A]
- **Objetivo**: qual produto empurrar; responde "qual empreendimento converte melhor?".
- **Componentes**: tabela-ranking de empreendimentos (leads recebidos, visitas, conversão visita→venda, vendas, VGV, ticket médio, velocidade de vendas/mês); gráfico de dispersão *interesse × conversão* (identifica produto com muito lead e pouca venda = problema de oferta ou preço); disponibilidade (unidades restantes por tipologia).
- **Regras**: dados vêm 100% do vínculo cliente→empreendimento (por isso o vínculo é obrigatório no interesse).

---

## MÓDULO 8 — KPIs

### T-21 · Metas & KPIs (configuração) [A; G para sua equipe]
- **Objetivo**: acabar com meta no código; gestão configura sem deploy.
- **Componentes**: tabela de metas diárias padrão (80 ligações · 40 WhatsApps · 20 follow-ups · 2 agendamentos · 2 comparecimentos · 1 pasta · 10 comparecimentos feirão) editável; metas mensais finais (30 comparecimentos · 10 aprovações · 3 vendas); **overrides por corretor** (ex.: novato em rampa: 50% no 1º mês) com vigência; pesos do "% do dia" (quanto cada KPI pesa no anel de progresso); SLAs por etapa; parâmetro "cliente esquecido" (dias).
- **Regras**: mudanças valem a partir do dia seguinte (nunca retroativas); todo ajuste fica no histórico com autor; valores padrão = os oficiais da DNA acima.

---

## MÓDULO 9 — RANKING

### T-22 · Ranking & Gamificação [C/G/A]
- **Objetivo**: competição saudável e visível; o corretor abre todo dia para ver sua posição.
- **Componentes**: pódio top 3 (avatar, pontos, prêmio do mês se houver); lista completa com posição, variação diária (↑↓), pontos, e os 3 números-chave (vendas, aprovações, % produção); abas `Mês` / `Semana` / `Ano`; **sistema de pontos** (configurável no T-21; sugestão: venda 500 · aprovação 150 · pasta 50 · comparecimento 30 · agendamento 15 · dia de meta batida 25 · sequência de 5 dias +100); selos/conquistas (🔥 sequência, 🏆 1º do mês, 💰 maior VGV, 📞 rei da prospecção); tela-TV (modo quiosque para monitor da loja, atualização automática).
- **Regras**: pontos gerados exclusivamente pelos registros automáticos (imexível manualmente); empate = maior VGV; histórico de campeões mensais permanente.

---

## MÓDULO 10 — EMPREENDIMENTOS

### T-23 · Catálogo de Empreendimentos [C/G/A]
- **Objetivo**: o corretor vende com o catálogo na mão; a gestão mede produto.
- **Componentes**: cards com foto de capa, nome, construtora, região, faixa de preço, tipologias, status (lançamento/em obras/pronto), % vendido, selo "🔥 destaque do mês" (definido pela gestão); busca e filtros (região, faixa, tipologia, status, construtora).
- **Ações**: abrir ficha; compartilhar (gera link/PDF de apresentação para mandar ao cliente via WhatsApp).

### T-24 · Ficha do Empreendimento [C/G/A]
- **Componentes**: galeria de fotos; dados (endereço, construtora, entrega, condições de pagamento, tabela de preços vigente com data); **espelho de unidades** (grade torre×andar ou lista: unidade, tipologia, m², valor, status disponível/reservado/vendido); materiais (book PDF, plantas, vídeos); métricas (gerente+): leads interessados, visitas, conversão, VGV vendido; lista de clientes interessados (respeitando permissão).
- **Ações**: vincular cliente interessado; reservar unidade (gerente confirma; expira em X dias configurável); marcar unidade como vendida (automático ao fechar venda na T-05).
- **Regras**: reserva expira e volta a disponível com notificação; tabela de preços versionada (histórico).

### T-25 · Cadastro de Empreendimento / Construtoras [A]
- **Componentes**: form do empreendimento (dados + upload de materiais + tabela de unidades via formulário ou importação de planilha); cadastro de construtoras (nome, contato, % comissão padrão, prazo de repasse).
- **Regras**: só admin cria/edita; importação de planilha valida duplicidade de unidade.

---

## MÓDULO 11 — COMISSÕES

### T-26 · Minhas Comissões [C]
- **Objetivo**: transparência total — corretor motivado é corretor que sabe quanto vai receber.
- **Componentes**: cards `A receber` / `Recebido no ano` / `Projetado` (clientes em Aprovados × ticket médio × conversão histórica); lista por venda: cliente, empreendimento, valor da venda, % e valor da comissão, status (pipeline de pagamento: `Venda registrada → Contrato assinado → Repasse construtora → Pago`), previsão de data; extrato por mês.
- **Regras**: corretor NUNCA edita valores — só visualiza; divergência → botão "contestar" (abre pendência para gestão).

### T-27 · Gestão de Comissões [A; G leitura da equipe]
- **Componentes**: esteira Kanban dos pagamentos (mesmos 4 status), tabela consolidada por corretor/mês, regras de comissionamento (% por construtora/empreendimento, splits corretor/gerente/casa, override por venda com justificativa); conciliação: marcar recebimento da construtora → libera pagamento do corretor.
- **Indicadores**: comissão total gerada no mês, a pagar, recebida de construtoras, margem da casa.
- **Regras**: toda alteração de valor auditada (autor + antes/depois + motivo); fechamento mensal congela o extrato.

---

## MÓDULO 12 — FINANCEIRO

### T-28 · Visão Financeira [A]
- **Objetivo**: o dono vê o dinheiro do negócio em uma tela (escopo: financeiro COMERCIAL — ver questionamento Q4 na Parte 4).
- **Componentes**: cards `VGV do mês/ano` · `Receita de comissões (casa)` · `A receber de construtoras` (aging: <30/30-60/>60 dias) · `A pagar a corretores`; gráfico de colunas empilhadas receita×repasse por mês (12 meses); tabela de recebíveis por construtora com atraso em destaque; projeção de caixa comercial 90 dias (vendas em esteira × prazos médios).
- **Regras**: alimentado exclusivamente pelas vendas e comissões (sem lançamento manual de despesas nesta fase); exportável Excel.

---

## MÓDULO 13 — CONFIGURAÇÕES

### T-29 · Configurações [A; itens pessoais para todos]
- **Componentes**: `Minha conta` (nome, foto, telefone, senha, notificações — substitui o /perfil atual); `Operação` [A]: horário comercial, dias úteis, feriados, parâmetros do motor de inteligência (dias p/ esquecido, SLAs — espelho do T-21); `Aparência` [A]: logo, cor de destaque; `Notificações` [A]: quais alertas vão para push/WhatsApp/e-mail, por perfil.
- **Regras**: toda configuração com valor padrão sensato; nada obrigatório para o sistema operar.

## MÓDULO 14 — USUÁRIOS

### T-30 · Usuários & Equipes [A]
- **Componentes**: lista (nome, e-mail, perfil, equipe, status ativo/inativo, último acesso); form de convite por e-mail (perfil + equipe + gerente); **árvore de equipes** (arrastar corretor entre equipes); desativação (mantém histórico, redistribui carteira com assistente: "para quem vão os 34 clientes de Fulano?").
- **Regras**: nunca excluir usuário (só desativar — auditoria); rebaixar gerente exige reatribuir a equipe antes; perfis fixos: CORRETOR / GERENTE / ADMINISTRADOR.

## MÓDULO 15 — ADMINISTRAÇÃO

### T-31 · Administração & Auditoria [A]
- **Componentes**: trilha de auditoria filtrável (quem fez o quê, quando — dos históricos automáticos); saúde do sistema (últimos erros, fila de notificações); integrações (WhatsApp Business API, portais de leads — Fase 3, ver roadmap); exportação LGPD (dossiê de um cliente) e anonimização sob solicitação; backups (status).
- **Regras**: acesso exclusivo admin; ações de LGPD registradas na própria trilha.

## MÓDULO 16 — RELATÓRIOS

### T-32 · Central de Relatórios [G/A]
- **Objetivo**: qualquer reunião preparada em 1 minuto.
- **Componentes**: galeria de relatórios prontos: `Resultado mensal` (1 página executiva), `Produção da equipe` (por período), `Funil e conversão`, `Ranking do mês`, `Comissões por corretor`, `Empreendimentos`, `Clientes por etapa (carteira)`, `Perdas e motivos`; cada um com pré-visualização, filtros (período/equipe/corretor/empreendimento) e exportação **PDF** (apresentação) e **Excel** (análise); agendamento: enviar por e-mail toda segunda 8h (config).
- **Regras**: PDF com identidade DNA; números idênticos aos dashboards (mesma fonte, mesmo cálculo — princípio de verdade única).

## MÓDULO 17 — IA

### T-33 · Assistente DNA [C/G/A]
- **Objetivo**: a inteligência operacional com rosto — pergunta em português, resposta com dado do CRM.
- **Componentes**: chat acessível pelo Menu e por atalho na Central de Operações; **cartões de insight proativos** no topo (gerados pelo motor da Seção 2.5: "Conversão em Análise caiu 30% esta semana — 6 dos 9 clientes travados são do Reserva das Águas; a tabela de preços subiu dia 3. Sugestão: revisar condição comercial."); habilidades: responder perguntas de gestão ("quem converte melhor no João Paulo II?"), resumir cliente antes da visita ("me prepara para a visita das 10h"), rascunhar mensagem de follow-up no tom DNA, explicar qualquer número de dashboard ("por que a projeção caiu?").
- **Regras**: responde SOMENTE com dados do CRM respeitando as permissões de quem pergunta (corretor não extrai dados de outro); toda resposta numérica com link "ver dados"; nunca executa ação sozinho — sugere e pede confirmação (ex.: "quer que eu crie os 3 follow-ups?").

## MÓDULO 18 — PÓS-VENDA

### T-34 · Esteira de Pós-venda [C/G/A]
- **Objetivo**: da assinatura às chaves sem cliente perdido no limbo — e transformar cliente em fonte de indicação.
- **Componentes**: Kanban da esteira (sub-status DENTRO da etapa Pós-venda do pipeline oficial — o funil não muda): `Assinatura de contrato → Documentação banco/ITBI → Acompanhamento de obra → Vistoria → Entrega de chaves → Relacionamento`; cada cliente com checklist da fase e responsável; **régua de relacionamento automática**: tarefas geradas em D+7 (pesquisa de satisfação), D+30 (pedido de indicação), aniversário da compra, entrega de chaves (felicitação); painel de indicações: quantos novos leads vieram de cada cliente (origem "Indicação" linkada).
- **Indicadores**: tempo médio assinatura→chaves; NPS (da pesquisa); taxa de indicação por cliente entregue.
- **Regras**: mover para "Entrega de chaves" pede foto (momento-troféu, alimenta o feed de conquistas); indicação gerada credita pontos de ranking ao corretor da venda.

---

## Telas de suporte (fora dos módulos)

- **T-40 · Login / Recuperar senha**: e-mail+senha, recuperação por e-mail, mensagem de boas-vindas com nome DNA. (Mantida, com visual novo.)
- **T-41 · Onboarding de 1º acesso**: 3 passos (foto/nome → tour de 60s pela barra inferior → primeira ação guiada: "registre seu primeiro atendimento"). Meta: produtivo em <5 minutos, sem manual.
- **T-42 · Central de Notificações**: sino no topo; lista dos alertas do motor com ação direta em cada um; configuração pessoal do que notifica.

---

# PARTE 4 — DECISÕES QUE QUESTIONAMOS (papel consultivo, não obediência cega)

**Q1 — 18 módulos de uma vez é risco, não ambição.** Manteremos os 18 no projeto, mas entregar tudo junto atrasa o que gera dinheiro. Nossa recomendação forte é o faseamento da Parte 5: a Central de Operações + Pipeline Kanban + Modo Turbo mudam o faturamento em semanas; Financeiro e integrações não. **Pedimos aprovação do faseamento, não só do escopo.**

**Q2 — Agendamento e Comparecimento no pipeline.** O sistema atual tinha "Agendamento" e "Comparecimento" como etapas do funil. Seu pipeline oficial (corretíssimo) não os tem. Tratamos ambos como **eventos/KPIs dentro de Contatos** — um cliente pode comparecer e voltar a ser trabalhado sem "regredir de etapa". Na migração de dados, clientes hoje nessas etapas serão mapeados para "Contatos" com o evento registrado. **Confirme este mapeamento.**

**Q3 — Meta de WhatsApps.** Sua especificação diz **40 WhatsApps**; em documentos anteriores do projeto circulou 80. Adotamos 40 como padrão — e de toda forma a meta vira configurável (T-21). **Confirme o valor.**

**Q4 — Financeiro completo é armadilha nesta fase.** Contas a pagar, folha e despesas transformariam o CRM num ERP ruim. Limitamos o Módulo 12 ao **financeiro comercial** (VGV, recebíveis de construtoras, repasses a corretores, projeção de caixa comercial). Se a DNA precisar de ERP contábil, integra-se depois. Discordamos de qualquer escopo além disso agora.

**Q5 — IA como módulo separado.** Colocamos o Assistente (T-33) como módulo por sua exigência, mas a inteligência de verdade está **embutida** em todas as telas (scores, alertas, plano do dia, projeções). O chat é a cereja; o motor é o bolo. Não aprove o módulo IA esperando mágica — aprove o motor da Seção 2.5.

**Q6 — Restrições e Condicionados como etapas sequenciais.** No fluxo real, Restrições e Condicionados são **desfechos paralelos da Análise**, não degraus em série (um cliente aprovado direto não passa por eles). O pipeline oficial permanece intocado como você ordenou — as 8 colunas ficam —, mas os relatórios de conversão tratarão Análise→{Restrições|Condicionados|Aprovados} como ramificação, senão as taxas etapa-a-etapa sairiam distorcidas. **Apenas informamos o tratamento estatístico; nada muda visualmente.**

**Q7 — Pontuação do ranking.** Propusemos uma tabela de pontos (T-22). É decisão de gestão comercial, não técnica: **valide os pesos** (ou delegue e ajustamos no piloto).

**Q8 — WhatsApp API oficial.** O ganho de produtividade nº 1 depois deste Blueprint seria registrar conversas de WhatsApp automaticamente (WhatsApp Business API). Custa mensalidade e exige aprovação Meta. Deixamos previsto na Fase 3 — **decida se orçamos**.

---

# PARTE 5 — ROADMAP DE RECONSTRUÇÃO

Preservado: banco, RLS, triggers de produção, auth, triagem, pasta digital, testes (fundação auditada na Parte 1.1). Reconstruído: toda a experiência + novas entidades (empreendimentos, comissões, eventos, metas configuráveis, scores).

| Fase | Conteúdo | Módulos | Valor de negócio |
|---|---|---|---|
| **F1 — Núcleo Operacional** | Design system, navegação nova (barra inferior/sidebar/busca), T-01 Cockpit, T-02 Central de Operações, T-04/T-05 Clientes 360°, T-09 Kanban, T-14 Modo Turbo, T-11 Agenda nova, T-42 Notificações | 1,2,3,4,5 | Corretor guiado + gerente com visão em 10s. **É aqui que a produtividade explode.** |
| **F2 — Gestão & Motivação** | T-15 Torre de Controle, T-16 Raio-X, T-17 Distribuição, T-21 Metas configuráveis, T-22 Ranking + TV, T-13 Produção, T-15b Feirão, motor de inteligência completo (scores/alertas/projeção) | 5,6,8,9 | Gestão por dados; competição saudável. |
| **F3 — Produto & Dinheiro** | T-23/24/25 Empreendimentos + unidades, T-26/27 Comissões, T-28 Financeiro comercial, T-18/19/20 Dashboards, T-32 Relatórios | 7,10,11,12,16 | Conversão por produto; transparência de comissão; relatório em 1 clique. |
| **F4 — Inteligência & Pós-venda** | T-33 Assistente DNA, T-34 Esteira de pós-venda + régua de indicações, T-31 Administração/LGPD, integrações (WhatsApp API se aprovada em Q8) | 13,14,15,17,18 | Máquina de indicações; operação que se auto-explica. |

Cada fase: planejamento → desenvolvimento → testes → piloto com a equipe → ajustes → próxima fase (mesmo método que funcionou no piloto atual). Migração de dados do sistema atual garantida em F1 (nenhuma triagem, cliente ou documento se perde).

---

# PARTE 6 — CRITÉRIOS DE ACEITE GLOBAIS & PRÓXIMO PASSO

1. Corretor novo opera sozinho em <5 minutos (T-41 + navegação de 5 itens).
2. Gerente responde as 10 perguntas de gestão sem sair da Torre de Controle.
3. Registrar qualquer atividade: ≤2 toques de qualquer tela.
4. Central de Operações do gerente legível em 10 segundos (teste com cronômetro no piloto).
5. Nenhum número em dashboard sem clique-para-detalhe (verdade auditável).
6. Todas as telas mobile-first, testadas primeiro em viewport 390px.
7. Nenhuma meta ou regra de negócio em código — tudo em configuração.

## PRÓXIMO PASSO

Este documento aguarda sua análise. Para aprovar, responda com:
1. **"Aprovado"** (ou ajustes tela a tela — use os códigos T-01…T-42);
2. Suas respostas aos questionamentos **Q1 a Q8** (Parte 4);
3. A confirmação do faseamento F1→F4 (ou reordenação).

Com a aprovação, a Fase 1 começa pelo design system + navegação + Central de Operações. **Nenhuma linha de código antes disso.**

---
*DNA CRM 2.0 · Blueprint v1.0 · Elaborado pela equipe de produto e arquitetura · 10/07/2026*




