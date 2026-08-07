# MATRIZ FINAL DE SINCRONIZAÇÃO — DNA CRM

> Gerada por `scripts/matriz-sincronizacao.mjs` em **2026-08-07T21:39:53.373Z** (banco de produção)
>
> **Código ✓** = objeto referenciado no código-fonte (`src/`) · **Banco ✓** = existe no banco · **Status**: OK / DIVERGENTE / n/a

## Resumo executivo

| Categoria | Objetos | Banco ✓ | Código ✓ |
|---|---|---|---|
| 1. Tabelas | 21 | 21 | 17 |
| 2. Colunas | 265 | 265 | 136 |
| 3. Enums | 14 | 14 | 11 |
| 4. RPCs (functions) | 77 | 77 | 4 |
| 5. Triggers | 33 | 33 | 0 |
| 6. Policies (RLS) | 44 | 44 | 0 |
| 7. Índices | 81 | 81 | 0 |
| **TOTAL** | **535** | **535** | **168** |

## 1. Tabelas (21)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `agendamentos` | ✓ | ✓ | OK |  |
| `atividades` | ✓ | ✓ | OK |  |
| `automacao_tarefas` | ✓ | ✓ | OK |  |
| `automacoes` | ✓ | ✓ | OK |  |
| `automacoes_fila` | ✓ | ✓ | OK |  |
| `automacoes_log` | ✓ | ✓ | OK |  |
| `clientes` | ✓ | ✓ | OK |  |
| `comparecimentos` | ✓ | ✓ | OK |  |
| `conjuges` | ✗ | ✓ | n/a |  |
| `copiloto_memoria` | ✗ | ✓ | n/a |  |
| `documentos` | ✓ | ✓ | OK |  |
| `empreendimentos` | ✓ | ✓ | OK |  |
| `equipes` | ✓ | ✓ | OK |  |
| `historico_acoes` | ✗ | ✓ | n/a |  |
| `leads` | ✗ | ✓ | n/a |  |
| `notificacoes` | ✓ | ✓ | OK |  |
| `producao_diaria` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations` | ✓ | ✓ | OK |  |
| `usuarios` | ✓ | ✓ | OK |  |
| `whatsapp_conversas` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens` | ✓ | ✓ | OK |  |

## 2. Colunas (265)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `agendamentos.id` | ✓ | ✓ | OK |  |
| `agendamentos.cliente_id` | ✓ | ✓ | OK |  |
| `agendamentos.corretor_id` | ✓ | ✓ | OK |  |
| `agendamentos.empreendimento_interesse` | ✓ | ✓ | OK |  |
| `agendamentos.data_hora` | ✓ | ✓ | OK |  |
| `agendamentos.status` | ✓ | ✓ | OK |  |
| `agendamentos.created_at` | ✓ | ✓ | OK |  |
| `agendamentos.updated_at` | ✓ | ✓ | OK |  |
| `agendamentos.empreendimento_id` | ✓ | ✓ | OK |  |
| `agendamentos.local` | ✗ | ✓ | n/a |  |
| `agendamentos.observacao` | ✗ | ✓ | n/a |  |
| `atividades.id` | ✓ | ✓ | OK |  |
| `atividades.cliente_id` | ✓ | ✓ | OK |  |
| `atividades.usuario_id` | ✓ | ✓ | OK |  |
| `atividades.tipo` | ✓ | ✓ | OK |  |
| `atividades.resultado` | ✓ | ✓ | OK |  |
| `atividades.observacao` | ✗ | ✓ | n/a |  |
| `atividades.created_at` | ✓ | ✓ | OK |  |
| `automacao_tarefas.id` | ✓ | ✓ | OK |  |
| `automacao_tarefas.tipo` | ✓ | ✓ | OK |  |
| `automacao_tarefas.titulo` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.descricao` | ✓ | ✓ | OK |  |
| `automacao_tarefas.entidade` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.entidade_id` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.responsavel_id` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.status` | ✓ | ✓ | OK |  |
| `automacao_tarefas.prioridade` | ✓ | ✓ | OK |  |
| `automacao_tarefas.prazo_em` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.origem` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.dados` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.concluido_em` | ✗ | ✓ | n/a |  |
| `automacao_tarefas.criado_em` | ✗ | ✓ | n/a |  |
| `automacoes.id` | ✓ | ✓ | OK |  |
| `automacoes.nome` | ✓ | ✓ | OK |  |
| `automacoes.descricao` | ✓ | ✓ | OK |  |
| `automacoes.status` | ✓ | ✓ | OK |  |
| `automacoes.evento` | ✓ | ✓ | OK |  |
| `automacoes.condicoes` | ✗ | ✓ | n/a |  |
| `automacoes.acoes` | ✗ | ✓ | n/a |  |
| `automacoes.prioridade` | ✓ | ✓ | OK |  |
| `automacoes.ultima_execucao` | ✗ | ✓ | n/a |  |
| `automacoes.qtd_executada` | ✗ | ✓ | n/a |  |
| `automacoes.qtd_falhas` | ✗ | ✓ | n/a |  |
| `automacoes.criado_por` | ✗ | ✓ | n/a |  |
| `automacoes.criado_em` | ✗ | ✓ | n/a |  |
| `automacoes.atualizado_em` | ✗ | ✓ | n/a |  |
| `automacoes.deleted_at` | ✗ | ✓ | n/a |  |
| `automacoes_fila.id` | ✓ | ✓ | OK |  |
| `automacoes_fila.evento` | ✓ | ✓ | OK |  |
| `automacoes_fila.entidade` | ✗ | ✓ | n/a |  |
| `automacoes_fila.entidade_id` | ✗ | ✓ | n/a |  |
| `automacoes_fila.payload` | ✗ | ✓ | n/a |  |
| `automacoes_fila.contexto` | ✗ | ✓ | n/a |  |
| `automacoes_fila.prioridade` | ✓ | ✓ | OK |  |
| `automacoes_fila.status` | ✓ | ✓ | OK |  |
| `automacoes_fila.tentativas` | ✗ | ✓ | n/a |  |
| `automacoes_fila.max_tentativas` | ✗ | ✓ | n/a |  |
| `automacoes_fila.erro` | ✗ | ✓ | n/a |  |
| `automacoes_fila.processado_em` | ✗ | ✓ | n/a |  |
| `automacoes_fila.criado_por` | ✗ | ✓ | n/a |  |
| `automacoes_fila.criado_em` | ✗ | ✓ | n/a |  |
| `automacoes_log.id` | ✓ | ✓ | OK |  |
| `automacoes_log.automacao_id` | ✗ | ✓ | n/a |  |
| `automacoes_log.evento_disparador` | ✗ | ✓ | n/a |  |
| `automacoes_log.entidade_contexto` | ✗ | ✓ | n/a |  |
| `automacoes_log.entidade_id` | ✗ | ✓ | n/a |  |
| `automacoes_log.payload` | ✗ | ✓ | n/a |  |
| `automacoes_log.condicoes_atendidas` | ✗ | ✓ | n/a |  |
| `automacoes_log.acoes_executadas` | ✗ | ✓ | n/a |  |
| `automacoes_log.status` | ✓ | ✓ | OK |  |
| `automacoes_log.erro` | ✗ | ✓ | n/a |  |
| `automacoes_log.duracao_ms` | ✗ | ✓ | n/a |  |
| `automacoes_log.criado_em` | ✗ | ✓ | n/a |  |
| `clientes.id` | ✓ | ✓ | OK |  |
| `clientes.nome` | ✓ | ✓ | OK |  |
| `clientes.cpf` | ✗ | ✓ | n/a |  |
| `clientes.telefone` | ✓ | ✓ | OK |  |
| `clientes.email` | ✗ | ✓ | n/a |  |
| `clientes.renda` | ✗ | ✓ | n/a |  |
| `clientes.dependentes` | ✗ | ✓ | n/a |  |
| `clientes.tempo_clt_meses` | ✗ | ✓ | n/a |  |
| `clientes.saldo_fgts` | ✗ | ✓ | n/a |  |
| `clientes.eh_casado` | ✗ | ✓ | n/a |  |
| `clientes.etapa_atual` | ✓ | ✓ | OK |  |
| `clientes.resultado_analise` | ✗ | ✓ | n/a |  |
| `clientes.ficha_proposta_assinada` | ✓ | ✓ | OK |  |
| `clientes.data_fechamento` | ✓ | ✓ | OK |  |
| `clientes.imovel_entregue_em` | ✗ | ✓ | n/a |  |
| `clientes.corretor_responsavel_id` | ✓ | ✓ | OK |  |
| `clientes.empreendimento_interesse` | ✓ | ✓ | OK |  |
| `clientes.proxima_acao` | ✓ | ✓ | OK |  |
| `clientes.proxima_acao_em` | ✓ | ✓ | OK |  |
| `clientes.observacoes` | ✗ | ✓ | n/a |  |
| `clientes.created_at` | ✓ | ✓ | OK |  |
| `clientes.updated_at` | ✓ | ✓ | OK |  |
| `clientes.deleted_at` | ✗ | ✓ | n/a |  |
| `clientes.ultima_atividade_em` | ✓ | ✓ | OK |  |
| `clientes.empreendimento_id` | ✓ | ✓ | OK |  |
| `clientes.vgv` | ✓ | ✓ | OK |  |
| `clientes.comissao_percentual` | ✗ | ✓ | n/a |  |
| `clientes.comissao_valor` | ✓ | ✓ | OK |  |
| `clientes.regiao_interesse` | ✗ | ✓ | n/a |  |
| `clientes.forma_renda` | ✗ | ✓ | n/a |  |
| `clientes.tres_anos_clt` | ✗ | ✓ | n/a |  |
| `clientes.possui_dependente` | ✗ | ✓ | n/a |  |
| `clientes.data_nascimento` | ✗ | ✓ | n/a |  |
| `clientes.pasta_completa_em` | ✗ | ✓ | n/a |  |
| `clientes.comissao_status` | ✓ | ✓ | OK |  |
| `clientes.comissao_data_prevista` | ✗ | ✓ | n/a |  |
| `clientes.comissao_data_recebimento` | ✓ | ✓ | OK |  |
| `clientes.entrou_etapa_em` | ✓ | ✓ | OK |  |
| `clientes.tempo_etapas` | ✓ | ✓ | OK |  |
| `comparecimentos.id` | ✓ | ✓ | OK |  |
| `comparecimentos.agendamento_id` | ✗ | ✓ | n/a |  |
| `comparecimentos.resultado` | ✓ | ✓ | OK |  |
| `comparecimentos.motivo_ausencia` | ✗ | ✓ | n/a |  |
| `comparecimentos.observacao` | ✗ | ✓ | n/a |  |
| `comparecimentos.created_at` | ✓ | ✓ | OK |  |
| `conjuges.id` | ✓ | ✓ | OK |  |
| `conjuges.cliente_id` | ✓ | ✓ | OK |  |
| `conjuges.nome` | ✓ | ✓ | OK |  |
| `conjuges.cpf` | ✗ | ✓ | n/a |  |
| `conjuges.renda` | ✗ | ✓ | n/a |  |
| `conjuges.tempo_clt_meses` | ✗ | ✓ | n/a |  |
| `conjuges.saldo_fgts` | ✗ | ✓ | n/a |  |
| `conjuges.created_at` | ✓ | ✓ | OK |  |
| `conjuges.updated_at` | ✓ | ✓ | OK |  |
| `conjuges.tres_anos_clt` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.id` | ✓ | ✓ | OK |  |
| `copiloto_memoria.usuario_id` | ✓ | ✓ | OK |  |
| `copiloto_memoria.tipo` | ✓ | ✓ | OK |  |
| `copiloto_memoria.pergunta` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.resposta` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.contexto_dados` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.acao` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.origem` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.util` | ✗ | ✓ | n/a |  |
| `copiloto_memoria.created_at` | ✓ | ✓ | OK |  |
| `documentos.id` | ✓ | ✓ | OK |  |
| `documentos.cliente_id` | ✓ | ✓ | OK |  |
| `documentos.tipo` | ✓ | ✓ | OK |  |
| `documentos.arquivo_url` | ✗ | ✓ | n/a |  |
| `documentos.status_validacao` | ✓ | ✓ | OK |  |
| `documentos.enviado_por` | ✓ | ✓ | OK |  |
| `documentos.created_at` | ✓ | ✓ | OK |  |
| `documentos.deleted_at` | ✗ | ✓ | n/a |  |
| `documentos.de_dependente` | ✗ | ✓ | n/a |  |
| `documentos.grau_parentesco` | ✗ | ✓ | n/a |  |
| `documentos.observacoes` | ✗ | ✓ | n/a |  |
| `documentos.data_aprovacao` | ✗ | ✓ | n/a |  |
| `documentos.vencimento` | ✗ | ✓ | n/a |  |
| `documentos.versao` | ✗ | ✓ | n/a |  |
| `documentos.atualizado_por` | ✗ | ✓ | n/a |  |
| `empreendimentos.id` | ✓ | ✓ | OK |  |
| `empreendimentos.nome` | ✓ | ✓ | OK |  |
| `empreendimentos.endereco` | ✗ | ✓ | n/a |  |
| `empreendimentos.vagas` | ✗ | ✓ | n/a |  |
| `empreendimentos.ativo` | ✓ | ✓ | OK |  |
| `empreendimentos.created_at` | ✓ | ✓ | OK |  |
| `empreendimentos.updated_at` | ✓ | ✓ | OK |  |
| `empreendimentos.deleted_at` | ✗ | ✓ | n/a |  |
| `equipes.id` | ✓ | ✓ | OK |  |
| `equipes.nome` | ✓ | ✓ | OK |  |
| `equipes.gerente_id` | ✗ | ✓ | n/a |  |
| `equipes.created_at` | ✓ | ✓ | OK |  |
| `equipes.updated_at` | ✓ | ✓ | OK |  |
| `equipes.deleted_at` | ✗ | ✓ | n/a |  |
| `historico_acoes.id` | ✓ | ✓ | OK |  |
| `historico_acoes.usuario_id` | ✓ | ✓ | OK |  |
| `historico_acoes.entidade` | ✗ | ✓ | n/a |  |
| `historico_acoes.entidade_id` | ✗ | ✓ | n/a |  |
| `historico_acoes.acao` | ✗ | ✓ | n/a |  |
| `historico_acoes.dados_anteriores` | ✗ | ✓ | n/a |  |
| `historico_acoes.dados_novos` | ✗ | ✓ | n/a |  |
| `historico_acoes.observacao` | ✗ | ✓ | n/a |  |
| `historico_acoes.created_at` | ✓ | ✓ | OK |  |
| `leads.id` | ✓ | ✓ | OK |  |
| `leads.nome` | ✓ | ✓ | OK |  |
| `leads.telefone` | ✓ | ✓ | OK |  |
| `leads.origem` | ✗ | ✓ | n/a |  |
| `leads.fez_ligacao` | ✗ | ✓ | n/a |  |
| `leads.ligou_whatsapp` | ✗ | ✓ | n/a |  |
| `leads.deixou_mensagem` | ✗ | ✓ | n/a |  |
| `leads.seguiu` | ✗ | ✓ | n/a |  |
| `leads.motivo_nao_seguiu` | ✗ | ✓ | n/a |  |
| `leads.corretor_id` | ✓ | ✓ | OK |  |
| `leads.convertido_cliente_id` | ✗ | ✓ | n/a |  |
| `leads.created_at` | ✓ | ✓ | OK |  |
| `leads.updated_at` | ✓ | ✓ | OK |  |
| `leads.deleted_at` | ✗ | ✓ | n/a |  |
| `notificacoes.id` | ✓ | ✓ | OK |  |
| `notificacoes.usuario_id` | ✓ | ✓ | OK |  |
| `notificacoes.tipo` | ✓ | ✓ | OK |  |
| `notificacoes.titulo` | ✗ | ✓ | n/a |  |
| `notificacoes.mensagem` | ✗ | ✓ | n/a |  |
| `notificacoes.link` | ✗ | ✓ | n/a |  |
| `notificacoes.lida` | ✓ | ✓ | OK |  |
| `notificacoes.created_at` | ✓ | ✓ | OK |  |
| `producao_diaria.id` | ✓ | ✓ | OK |  |
| `producao_diaria.usuario_id` | ✓ | ✓ | OK |  |
| `producao_diaria.data` | ✓ | ✓ | OK |  |
| `producao_diaria.ligacoes` | ✓ | ✓ | OK |  |
| `producao_diaria.whatsapp` | ✓ | ✓ | OK |  |
| `producao_diaria.follow_ups` | ✓ | ✓ | OK |  |
| `producao_diaria.agendamentos` | ✓ | ✓ | OK |  |
| `producao_diaria.comparecimentos` | ✓ | ✓ | OK |  |
| `producao_diaria.pastas` | ✓ | ✓ | OK |  |
| `producao_diaria.comparecimentos_feirao` | ✗ | ✓ | n/a |  |
| `producao_diaria.aprovacoes` | ✓ | ✓ | OK |  |
| `producao_diaria.vendas` | ✓ | ✓ | OK |  |
| `producao_diaria.pontuacao_gamificacao` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.id` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations.model_name` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations.benchmark_type` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations.resolved_rate` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations.avg_time_seconds` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.total_tasks` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.pass_k` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.date_added` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.metadata` | ✗ | ✓ | n/a |  |
| `swe_bench_evaluations.created_at` | ✓ | ✓ | OK |  |
| `swe_bench_evaluations.updated_at` | ✓ | ✓ | OK |  |
| `usuarios.id` | ✓ | ✓ | OK |  |
| `usuarios.nome` | ✓ | ✓ | OK |  |
| `usuarios.email` | ✗ | ✓ | n/a |  |
| `usuarios.telefone` | ✓ | ✓ | OK |  |
| `usuarios.perfil` | ✓ | ✓ | OK |  |
| `usuarios.gerente_id` | ✗ | ✓ | n/a |  |
| `usuarios.avatar_url` | ✓ | ✓ | OK |  |
| `usuarios.ativo` | ✓ | ✓ | OK |  |
| `usuarios.created_at` | ✓ | ✓ | OK |  |
| `usuarios.updated_at` | ✓ | ✓ | OK |  |
| `usuarios.deleted_at` | ✗ | ✓ | n/a |  |
| `usuarios.cpf` | ✗ | ✓ | n/a |  |
| `usuarios.creci` | ✗ | ✓ | n/a |  |
| `usuarios.data_admissao` | ✗ | ✓ | n/a |  |
| `usuarios.cargo` | ✓ | ✓ | OK |  |
| `usuarios.supervisor_id` | ✓ | ✓ | OK |  |
| `usuarios.status_usuario` | ✓ | ✓ | OK |  |
| `usuarios.equipe_id` | ✓ | ✓ | OK |  |
| `usuarios.ultima_atividade_em` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.id` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.cliente_id` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.usuario_id` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.provedor` | ✗ | ✓ | n/a |  |
| `whatsapp_conversas.provedor_chat_id` | ✗ | ✓ | n/a |  |
| `whatsapp_conversas.telefone_cliente` | ✗ | ✓ | n/a |  |
| `whatsapp_conversas.status` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.ultima_mensagem_em` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.total_mensagens` | ✗ | ✓ | n/a |  |
| `whatsapp_conversas.created_at` | ✓ | ✓ | OK |  |
| `whatsapp_conversas.updated_at` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.id` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.conversa_id` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.remetente` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.texto` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.tipo` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.media_url` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.media_type` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.template_id` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.template_dados` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.lida` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.enviada_em` | ✓ | ✓ | OK |  |
| `whatsapp_mensagens.entregue_em` | ✗ | ✓ | n/a |  |
| `whatsapp_mensagens.lida_em` | ✗ | ✓ | n/a |  |

## 3. Enums (14)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `acao_auditoria [CRIACAO, ATUALIZACAO, EXCLUSAO, MUDANCA_ETAPA]` | ✓ | ✓ | OK |  |
| `benchmark_tipo [verified, lite, full]` | ✗ | ✓ | n/a |  |
| `etapa_funil [NOVO_LEAD, CONTATOS, AGENDAMENTO, COMPARECIMENTO, ANALISE, RESTRICOES, CONDICIONADOS, APROVADOS, FECHAMENTOS, POS_VENDA]` | ✓ | ✓ | OK |  |
| `motivo_nao_atendimento [NAO_RESPONDEU, JA_COMPROU, PAROU_DE_RESPONDER, BLOQUEOU_CORRETOR, NAO_TEM_INTERESSE, NUMERO_NAO_EXISTE, NUMERO_ERRADO]` | ✗ | ✓ | n/a |  |
| `origem_atendimento [LEAD, LISTAS, INDICACAO, CARTEIRA]` | ✗ | ✓ | n/a |  |
| `perfil_usuario [CORRETOR, GERENTE, ADMINISTRADOR, SUPERVISOR]` | ✓ | ✓ | OK |  |
| `resultado_analise [RESTRICAO, CONDICIONADO, APROVADO, DOC_PENDENTE]` | ✓ | ✓ | OK |  |
| `resultado_comparecimento [COMPARECEU, NAO_COMPARECEU]` | ✓ | ✓ | OK |  |
| `status_agendamento [AGENDADO, CONFIRMADO, REMARCADO, CANCELADO]` | ✓ | ✓ | OK |  |
| `status_usuario [ATIVO, FERIAS, AFASTADO, DESLIGADO]` | ✓ | ✓ | OK |  |
| `status_validacao_doc [PENDENTE, VALIDADO, REJEITADO, RECEBIDO, EM_ANALISE]` | ✓ | ✓ | OK |  |
| `tipo_atividade [LIGACAO, WHATSAPP, FOLLOW_UP]` | ✓ | ✓ | OK |  |
| `tipo_documento [RG, CPF, CNH, COMPROVANTE_RENDA, FGTS, CONTRATO, PROPOSTA_PDF, OUTRO, COMPROVANTE_ENDERECO, CERTIDAO_NASCIMENTO, CERTIDAO_CASAMENTO, CERTIDAO_CASAMENTO_AVERBACAO, MO_AUTODECLARACAO_DEPENDENTE, HOLERITE, CARTEIRA_TRABALHO, EXTRATO_FGTS, DECLARACAO_IR]` | ✓ | ✓ | OK |  |
| `tipo_notificacao [CLIENTE_PARADO, AGENDAMENTO_HOJE, AGENDAMENTO_AMANHA, DOCUMENTO_PENDENTE, POS_VENDA_PRAZO, FECHAMENTO_REALIZADO, ANALISE_CONCLUIDA]` | ✓ | ✓ | OK |  |

## 4. RPCs (functions) (77)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `e_dono_do_cliente` | ✗ | ✓ | n/a |  |
| `e_gerente_de` | ✗ | ✓ | n/a |  |
| `fn_automacao_claim_fila` | ✓ | ✓ | OK |  |
| `fn_automacao_dispatch` | ✓ | ✓ | OK |  |
| `fn_calcular_comissao` | ✗ | ✓ | n/a |  |
| `fn_checklist_obrigatorio` | ✗ | ✓ | n/a |  |
| `fn_documento_atividade_cliente` | ✗ | ✓ | n/a |  |
| `fn_documento_versao` | ✗ | ✓ | n/a |  |
| `fn_pasta_completa` | ✗ | ✓ | n/a |  |
| `fn_pipeline_mudanca_etapa` | ✗ | ✓ | n/a |  |
| `fn_ranking_mes` | ✓ | ✓ | OK |  |
| `fn_tempo_medio_etapas` | ✗ | ✓ | n/a |  |
| `fn_touch_usuario_ultima_atividade` | ✗ | ✓ | n/a |  |
| `fn_update_equipes_updated_at` | ✗ | ✓ | n/a |  |
| `fn_upsert_producao` | ✗ | ✓ | n/a |  |
| `fn_vgv_por_etapa` | ✗ | ✓ | n/a |  |
| `gerar_notificacoes` | ✗ | ✓ | n/a |  |
| `get_empreendimentos_ativos` | ✗ | ✓ | n/a |  |
| `get_ranking_vgv` | ✗ | ✓ | n/a |  |
| `gin_extract_query_trgm` | ✗ | ✓ | n/a |  |
| `gin_extract_value_trgm` | ✗ | ✓ | n/a |  |
| `gin_trgm_consistent` | ✗ | ✓ | n/a |  |
| `gin_trgm_triconsistent` | ✗ | ✓ | n/a |  |
| `gtrgm_compress` | ✗ | ✓ | n/a |  |
| `gtrgm_consistent` | ✗ | ✓ | n/a |  |
| `gtrgm_decompress` | ✗ | ✓ | n/a |  |
| `gtrgm_distance` | ✗ | ✓ | n/a |  |
| `gtrgm_in` | ✗ | ✓ | n/a |  |
| `gtrgm_options` | ✗ | ✓ | n/a |  |
| `gtrgm_out` | ✗ | ✓ | n/a |  |
| `gtrgm_penalty` | ✗ | ✓ | n/a |  |
| `gtrgm_picksplit` | ✗ | ✓ | n/a |  |
| `gtrgm_same` | ✗ | ✓ | n/a |  |
| `gtrgm_union` | ✗ | ✓ | n/a |  |
| `handle_novo_usuario` | ✗ | ✓ | n/a |  |
| `is_admin` | ✗ | ✓ | n/a |  |
| `is_admin` | ✗ | ✓ | n/a |  |
| `is_gerente` | ✗ | ✓ | n/a |  |
| `is_supervisor` | ✗ | ✓ | n/a |  |
| `notificar_analise` | ✗ | ✓ | n/a |  |
| `notificar_fechamento` | ✗ | ✓ | n/a |  |
| `registrar_auditoria_auto` | ✓ | ✓ | OK |  |
| `set_empreendimento_updated_at` | ✗ | ✓ | n/a |  |
| `set_limit` | ✗ | ✓ | n/a |  |
| `show_limit` | ✗ | ✓ | n/a |  |
| `show_trgm` | ✗ | ✓ | n/a |  |
| `similarity` | ✗ | ✓ | n/a |  |
| `similarity_dist` | ✗ | ✓ | n/a |  |
| `similarity_op` | ✗ | ✓ | n/a |  |
| `strict_word_similarity` | ✗ | ✓ | n/a |  |
| `strict_word_similarity_commutator_op` | ✗ | ✓ | n/a |  |
| `strict_word_similarity_dist_commutator_op` | ✗ | ✓ | n/a |  |
| `strict_word_similarity_dist_op` | ✗ | ✓ | n/a |  |
| `strict_word_similarity_op` | ✗ | ✓ | n/a |  |
| `trg_fn_agendamento_funil` | ✗ | ✓ | n/a |  |
| `trg_fn_agendamento_producao` | ✗ | ✓ | n/a |  |
| `trg_fn_atividade_producao` | ✗ | ✓ | n/a |  |
| `trg_fn_auditoria` | ✗ | ✓ | n/a |  |
| `trg_fn_auditoria_clientes` | ✗ | ✓ | n/a |  |
| `trg_fn_cliente_fechamento` | ✗ | ✓ | n/a |  |
| `trg_fn_comissao_venda_fechada` | ✗ | ✓ | n/a |  |
| `trg_fn_comparecimento_funil` | ✗ | ✓ | n/a |  |
| `trg_fn_comparecimento_producao` | ✗ | ✓ | n/a |  |
| `trg_fn_criar_conjuge` | ✗ | ✓ | n/a |  |
| `trg_fn_documento_pasta` | ✗ | ✓ | n/a |  |
| `trg_fn_lead_producao` | ✗ | ✓ | n/a |  |
| `trg_fn_set_atualizado_em` | ✗ | ✓ | n/a |  |
| `trg_fn_set_updated_at` | ✗ | ✓ | n/a |  |
| `trg_fn_toque_cliente` | ✗ | ✓ | n/a |  |
| `trg_fn_toque_cliente_via_agendamento` | ✗ | ✓ | n/a |  |
| `trg_fn_wp_atualiza_conversa` | ✗ | ✓ | n/a |  |
| `trg_fn_wp_producao` | ✗ | ✓ | n/a |  |
| `word_similarity` | ✗ | ✓ | n/a |  |
| `word_similarity_commutator_op` | ✗ | ✓ | n/a |  |
| `word_similarity_dist_commutator_op` | ✗ | ✓ | n/a |  |
| `word_similarity_dist_op` | ✗ | ✓ | n/a |  |
| `word_similarity_op` | ✗ | ✓ | n/a |  |

## 5. Triggers (33)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `agendamento_producao → agendamentos (fn: trg_fn_agendamento_producao)` | — | ✓ | OK | n/a no código (banco) |
| `agendamento_sincroniza_funil → agendamentos (fn: trg_fn_agendamento_funil)` | — | ✓ | OK | n/a no código (banco) |
| `agendamento_toque → agendamentos (fn: trg_fn_toque_cliente)` | — | ✓ | OK | n/a no código (banco) |
| `atividade_producao → atividades (fn: trg_fn_atividade_producao)` | — | ✓ | OK | n/a no código (banco) |
| `atividade_toque → atividades (fn: trg_fn_toque_cliente)` | — | ✓ | OK | n/a no código (banco) |
| `auditoria → leads (fn: trg_fn_auditoria)` | — | ✓ | OK | n/a no código (banco) |
| `auditoria → documentos (fn: trg_fn_auditoria)` | — | ✓ | OK | n/a no código (banco) |
| `auditoria → agendamentos (fn: trg_fn_auditoria)` | — | ✓ | OK | n/a no código (banco) |
| `auditoria → clientes (fn: trg_fn_auditoria_clientes)` | — | ✓ | OK | n/a no código (banco) |
| `cliente_criar_conjuge → clientes (fn: trg_fn_criar_conjuge)` | — | ✓ | OK | n/a no código (banco) |
| `cliente_fechamento → clientes (fn: trg_fn_cliente_fechamento)` | — | ✓ | OK | n/a no código (banco) |
| `comparecimento_producao → comparecimentos (fn: trg_fn_comparecimento_producao)` | — | ✓ | OK | n/a no código (banco) |
| `comparecimento_sincroniza_funil → comparecimentos (fn: trg_fn_comparecimento_funil)` | — | ✓ | OK | n/a no código (banco) |
| `comparecimento_toque → comparecimentos (fn: trg_fn_toque_cliente_via_agendamento)` | — | ✓ | OK | n/a no código (banco) |
| `documento_pasta → documentos (fn: trg_fn_documento_pasta)` | — | ✓ | OK | n/a no código (banco) |
| `lead_producao → leads (fn: trg_fn_lead_producao)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → leads (fn: trg_fn_set_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → conjuges (fn: trg_fn_set_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → agendamentos (fn: trg_fn_set_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → usuarios (fn: trg_fn_set_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → automacoes (fn: trg_fn_set_atualizado_em)` | — | ✓ | OK | n/a no código (banco) |
| `set_updated_at → clientes (fn: trg_fn_set_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `trg_calcular_comissao → clientes (fn: fn_calcular_comissao)` | — | ✓ | OK | n/a no código (banco) |
| `trg_documento_atividade_cliente → documentos (fn: fn_documento_atividade_cliente)` | — | ✓ | OK | n/a no código (banco) |
| `trg_documento_versao → documentos (fn: fn_documento_versao)` | — | ✓ | OK | n/a no código (banco) |
| `trg_empreendimento_updated_at → empreendimentos (fn: set_empreendimento_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `trg_equipes_updated_at → equipes (fn: fn_update_equipes_updated_at)` | — | ✓ | OK | n/a no código (banco) |
| `trg_notificar_analise → clientes (fn: notificar_analise)` | — | ✓ | OK | n/a no código (banco) |
| `trg_notificar_fechamento → clientes (fn: notificar_fechamento)` | — | ✓ | OK | n/a no código (banco) |
| `trg_pipeline_mudanca_etapa → clientes (fn: fn_pipeline_mudanca_etapa)` | — | ✓ | OK | n/a no código (banco) |
| `trg_touch_usuario_atividade → atividades (fn: fn_touch_usuario_ultima_atividade)` | — | ✓ | OK | n/a no código (banco) |
| `trg_wp_mensagem_criada → whatsapp_mensagens (fn: trg_fn_wp_atualiza_conversa)` | — | ✓ | OK | n/a no código (banco) |
| `trg_wp_producao → whatsapp_mensagens (fn: trg_fn_wp_producao)` | — | ✓ | OK | n/a no código (banco) |

## 6. Policies (RLS) (44)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `agendamentos: agendamentos_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `agendamentos: agendamentos_update [UPDATE] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `agendamentos: agendamentos_write [INSERT] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `atividades: atividades_insert [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `atividades: atividades_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `automacao_tarefas: automacao_tarefas_admin_gerente [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `automacoes: automacoes_crud [ALL] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `automacoes_fila: automacoes_fila_select [SELECT] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `automacoes_fila: automacoes_fila_update [UPDATE] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `automacoes_log: automacoes_log_crud [ALL] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `clientes: clientes_insert [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `clientes: clientes_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `clientes: clientes_update [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `comparecimentos: comparecimentos_all [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `conjuges: conjuges_all [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `copiloto_memoria: copiloto_memoria_insert_owner [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `copiloto_memoria: copiloto_memoria_select_owner [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `documentos: documentos_all [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `empreendimentos: admin_empreendimentos_all [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `empreendimentos: corretor_empreendimentos_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `empreendimentos: gerente_empreendimentos_all [ALL] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `equipes: equipes_select [SELECT] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `equipes: equipes_write [ALL] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `historico_acoes: historico_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `historico_acoes: historico_select_por_cliente [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `leads: leads_insert [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `leads: leads_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `leads: leads_update [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `notificacoes: notificacoes_insert_system [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `notificacoes: notificacoes_select_owner [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `notificacoes: notificacoes_update_owner [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `producao_diaria: producao_select [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `swe_bench_evaluations: swe_bench_evaluations_insert_auth [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `swe_bench_evaluations: swe_bench_evaluations_select_auth [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `swe_bench_evaluations: swe_bench_evaluations_update_auth [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `usuarios: usuarios_admin_all [INSERT] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `usuarios: usuarios_select [SELECT] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `usuarios: usuarios_update_self [UPDATE] → {authenticated}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_conversas: whatsapp_conversas_insert_auth [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_conversas: whatsapp_conversas_select_auth [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_conversas: whatsapp_conversas_update_auth [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_mensagens: whatsapp_mensagens_insert_auth [INSERT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_mensagens: whatsapp_mensagens_select_auth [SELECT] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |
| `whatsapp_mensagens: whatsapp_mensagens_update_auth [UPDATE] → {public}` | — | ✓ | OK | n/a no código (RLS no banco) |

## 7. Índices (81)

| Objeto | Código | Banco | Status | Nota |
|---|---|---|---|---|
| `agendamentos_pkey (agendamentos) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_agendamentos_cliente (agendamentos)` | — | ✓ | OK | n/a no código (perf) |
| `idx_agendamentos_corretor_data (agendamentos)` | — | ✓ | OK | n/a no código (perf) |
| `idx_agendamentos_empreendimento (agendamentos)` | — | ✓ | OK | n/a no código (perf) |
| `atividades_pkey (atividades) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_atividades_cliente_data (atividades)` | — | ✓ | OK | n/a no código (perf) |
| `idx_atividades_created_brin (atividades)` | — | ✓ | OK | n/a no código (perf) |
| `idx_atividades_usuario_data (atividades)` | — | ✓ | OK | n/a no código (perf) |
| `automacao_tarefas_pkey (automacao_tarefas) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_automacao_tarefas_entidade (automacao_tarefas)` | — | ✓ | OK | n/a no código (perf) |
| `idx_automacao_tarefas_status (automacao_tarefas)` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_evento_status_idx (automacoes)` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_pkey (automacoes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_prioridade_idx (automacoes)` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_fila_pkey (automacoes_fila) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_fila_status_prio_idx (automacoes_fila)` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_log_automacao_idx (automacoes_log)` | — | ✓ | OK | n/a no código (perf) |
| `automacoes_log_pkey (automacoes_log) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `clientes_cpf_key (clientes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `clientes_pkey (clientes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_busca_trgm (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_comissao_prevista (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_comissao_status_data (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_corretor_comissao (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_empreendimento (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_empreendimento_vgv (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_entrou_etapa (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_pipeline (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_ultima_atividade (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_clientes_vgv_financeiro (clientes)` | — | ✓ | OK | n/a no código (perf) |
| `comparecimentos_agendamento_id_key (comparecimentos) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `comparecimentos_pkey (comparecimentos) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `conjuges_cliente_id_key (conjuges) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `conjuges_pkey (conjuges) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `copiloto_memoria_pkey (copiloto_memoria) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_copiloto_memoria_tipo (copiloto_memoria)` | — | ✓ | OK | n/a no código (perf) |
| `idx_copiloto_memoria_usuario (copiloto_memoria)` | — | ✓ | OK | n/a no código (perf) |
| `documentos_pkey (documentos) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_documentos_cliente_tipo (documentos)` | — | ✓ | OK | n/a no código (perf) |
| `idx_documentos_observacao_trgm (documentos)` | — | ✓ | OK | n/a no código (perf) |
| `idx_documentos_vencimento (documentos)` | — | ✓ | OK | n/a no código (perf) |
| `empreendimentos_pkey (empreendimentos) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_empreendimentos_ativo (empreendimentos)` | — | ✓ | OK | n/a no código (perf) |
| `equipes_nome_unico (equipes)` | — | ✓ | OK | n/a no código (perf) |
| `equipes_pkey (equipes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_equipes_gerente (equipes)` | — | ✓ | OK | n/a no código (perf) |
| `historico_acoes_pkey (historico_acoes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_historico_created_brin (historico_acoes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_historico_entidade (historico_acoes)` | — | ✓ | OK | n/a no código (perf) |
| `idx_leads_corretor (leads)` | — | ✓ | OK | n/a no código (perf) |
| `idx_leads_seguiu (leads)` | — | ✓ | OK | n/a no código (perf) |
| `leads_convertido_cliente_id_key (leads) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `leads_pkey (leads) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_notificacoes_usuario_lida (notificacoes)` | — | ✓ | OK | n/a no código (perf) |
| `notificacoes_pkey (notificacoes) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_producao_data (producao_diaria)` | — | ✓ | OK | n/a no código (perf) |
| `producao_diaria_pkey (producao_diaria) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `producao_diaria_usuario_id_data_key (producao_diaria) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_swe_bench_benchmark (swe_bench_evaluations)` | — | ✓ | OK | n/a no código (perf) |
| `idx_swe_bench_date_added (swe_bench_evaluations)` | — | ✓ | OK | n/a no código (perf) |
| `idx_swe_bench_model_name (swe_bench_evaluations)` | — | ✓ | OK | n/a no código (perf) |
| `idx_swe_bench_resolved_rate (swe_bench_evaluations)` | — | ✓ | OK | n/a no código (perf) |
| `idx_swe_bench_updated_at (swe_bench_evaluations)` | — | ✓ | OK | n/a no código (perf) |
| `swe_bench_evaluations_pkey (swe_bench_evaluations) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_cpf (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_creci (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_equipe (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_gerente (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_perfil (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_status (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_supervisor (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `idx_usuarios_ultima_atividade (usuarios)` | — | ✓ | OK | n/a no código (perf) |
| `usuarios_email_key (usuarios) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `usuarios_pkey (usuarios) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_whatsapp_conversas_cliente (whatsapp_conversas)` | — | ✓ | OK | n/a no código (perf) |
| `idx_whatsapp_conversas_ultima (whatsapp_conversas)` | — | ✓ | OK | n/a no código (perf) |
| `idx_whatsapp_conversas_usuario (whatsapp_conversas)` | — | ✓ | OK | n/a no código (perf) |
| `whatsapp_conversas_pkey (whatsapp_conversas) [constraint]` | — | ✓ | OK | n/a no código (perf) |
| `idx_whatsapp_mensagens_conversa (whatsapp_mensagens)` | — | ✓ | OK | n/a no código (perf) |
| `idx_whatsapp_mensagens_nao_lidas (whatsapp_mensagens)` | — | ✓ | OK | n/a no código (perf) |
| `whatsapp_mensagens_pkey (whatsapp_mensagens) [constraint]` | — | ✓ | OK | n/a no código (perf) |

---

**Total de objetos auditados: 535 · OK: 535 · DIVERGENTE: 0**
