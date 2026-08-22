# Agente Inteligente — mapa técnico e implantação incremental

## 1. Mapa técnico real

- Aplicação: Next.js 16.3 (App Router), React 19 e TypeScript estrito.
- Persistência: Supabase/Postgres; acesso administrativo somente no servidor.
- Autenticação atual: sessão própria assinada por HMAC e protegida pelo `proxy.ts`.
- Fonte única do cliente: `clients`.
- Histórico comercial único: `client_events`.
- Mudança de jornada: RPC transacional `transition_client_journey`.
- Compromissos e próxima ação: `appointments` e campos canônicos em `clients`.
- Documentos: tabela `documents` e Supabase Storage.
- Venda/VGV/comissão: `sales`, com cancelamento auditável por RPC.
- Catálogo: `builders` e `projects`; parceiros financeiros: `cca_partners`.
- WhatsApp atual: abertura de links `wa.me`; não existe provedor conectado, webhook ou fila de envio.

## 2. Componentes reaproveitados

- `clients` permanece a ficha única e não será espelhada em uma tabela de leads.
- `client_events` permanece o histórico visível da jornada.
- `transition_client_journey` permanece o único caminho de alteração de etapa.
- `appointments` alimenta agenda, cadência e próxima ação.
- `sales` permanece a origem de VGV e comissão.
- `builders/projects` permanecem a origem Cidade → Construtora → Empreendimento.
- Rotas API do App Router permanecem a camada servidor para a interface.

## 3. Lacunas encontradas

- Não há fila persistente de tarefas do agente.
- Não há idempotência transversal para ações automáticas.
- Não há Policy Engine nem Confidence Gate determinísticos.
- Não há configuração persistente de autonomia, Kill Switch ou Simulation Mode.
- Não há auditoria estruturada de decisão → autorização → execução → leitura de retorno.
- Não há provedor real de WhatsApp, identidade de sessão ou tratamento de mensagens recebidas.
- Não há RBAC granular; existe uma única sessão operacional.

## 4. Alterações de banco — Sprint Estrutural A

- Adicionar consentimento operacional em `clients`: `can_contact`, `do_not_contact`, `opt_out_at`.
- Criar `agent_tasks`: fila P0–P5, vencimento, tentativas e chave idempotente.
- Criar `agent_events`: Event Log técnico append-only, com correlação e payload estruturado.
- Criar `agent_audit_logs`: decisão, política, confiança, execução e read-back.
- Criar `agent_action_executions`: trava persistente de idempotência por ação.
- Criar `agent_autonomy_config`: níveis por capacidade, limites, Kill Switch e simulação.
- Criar `agent_human_escalations`: handoff humano rastreável.
- Criar RPC `enqueue_agent_task`, que retorna a tarefa existente quando a chave já foi usada.

`agent_events` não substitui `client_events`: registra telemetria técnica. Qualquer mudança de negócio continua sendo registrada na ficha única e no histórico comercial.

## 5. Arquitetura adaptada

```text
Contexto persistido do CRM
          ↓
LLM produz decisão estruturada (sem efeito externo)
          ↓
Policy Engine determinístico
          ↓
Confidence Gate determinístico
          ↓
Action Executor com idempotência e Kill Switch
          ↓
Executor real ou Simulation Executor
          ↓
Read-back obrigatório
          ↓
agent_audit_logs + agent_events
          ↓
client_events quando houver consequência comercial
```

O estado canônico do agente é uma projeção tipada dos campos atuais da ficha, não uma nova coluna concorrente.

## 6. Riscos e controles

- Envio indevido: bloqueio por `do_not_contact`, permissão, horário, confiança e Kill Switch.
- Ação duplicada: chave idempotente única no banco e reserva antes da execução.
- Alucinação com efeito: a decisão do modelo nunca chama integração diretamente.
- Divergência do CRM: read-back obrigatório antes de concluir a ação.
- Migração regressiva: novas estruturas são aditivas; nenhuma regra existente é removida.
- Dados sensíveis: payloads de auditoria não devem guardar segredos nem documentos integrais.
- Automação prematura: padrão inicial é `simulation`, com capacidades em `suggest`.

## 7. Ordem exata

1. Sprint A: tipos, projeção de LeadStage, Event Log, auditoria, tarefas e prioridade.
2. Sprint A: idempotência, Policy Engine, Confidence Gate, autonomia, Kill Switch e simulação.
3. Aplicar migração e validar invariantes no Supabase.
4. Testar unidade, lint, typecheck/build e regressões existentes.
5. Sprint B: `WhatsAppProvider` abstrato, sessão QR e identidade vinculada.
6. Sprint B: inbound/outbound, read-back, deduplicação e reprocessamento seguro.
7. Ativar capacidades uma a uma: `suggest` → `approval` → `automatic`, com métricas reais.

