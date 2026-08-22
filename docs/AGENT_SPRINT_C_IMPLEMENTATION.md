# Sprint C-A — cérebro comercial do Agente Monteiro

Atualizado em: 22/08/2026

Status: **implementado e validado localmente; migration remota pendente**.

## Arquitetura

```text
CRM Context Builder
→ LLMProviderRegistry
→ LLMProvider ou fallback determinístico
→ AgentDecision estruturada
→ Policy Engine
→ Confidence Gate
→ Simulation/Approval/Executor
→ read-back
→ agent_events + agent_audit_logs
→ client_events somente quando houver efeito comercial
```

O LLM nunca executa side effects. `AgentDecision` cognitiva permanece separada de `StructuredDecision`, contrato existente de execução. A integração inbound mantém dedupe, identidade, prioridade P0, cancelamento de tarefas incompatíveis, Human Takeover, auditoria e histórico.

## Providers

- `LLMProvider`: `decide`, `extract`, `summarize` e `evaluate`.
- `LLMProviderRegistry`: prioridade, fallback sequencial e fallback determinístico.
- `OpenAICompatibleProvider`: endpoint configurável, chave referenciada por nome de variável de ambiente e JSON estruturado.
- Nenhuma API key é persistida ou enviada ao cliente. O banco guarda somente `api_key_ref`.
- Sem provider configurado, o CRM continua em fallback determinístico seguro.

## Contexto e memória

`buildAgentContext` lê cliente, projeção de jornada, eventos, compromissos, documentos, mensagens recentes, resumo incremental, conhecimento estruturado e controle da conversa. O histórico inteiro não é enviado a cada decisão.

Memória usa `FACT`, `INFERENCE` e `UNKNOWN`, origem opcional por mensagem, confiança e histórico por supersessão. Uma `INFERENCE` não substitui um `FACT` ativo.

## Intenções, estratégia e próxima ação

As 23 intenções fechadas, 16 estratégias comerciais e 16 ações permitidas da especificação estão tipadas. Detecção aceita múltiplas intenções. Segurança financeira classifica financiamento, parcela e subsídio como `FINANCING_REQUEST`; sem dado confirmado, propõe `EXPLAIN_PRE_ANALYSIS` e não inventa números.

Pedido humano produz `HUMAN_REQUEST`, `ESCALATE_HUMAN` e `requiresHuman=true`. Em `HUMAN_TAKEOVER`, `OBSERVE_ONLY` ou `PAUSED`, interpretação e extração continuam; mensagem automática não é proposta.

## Resposta e follow-up

Resposta usa contexto, estratégia e próxima ação. Não repete formulário completo e mantém uma pergunta por padrão. Follow-up considera estágio, última interação, compromisso, temperatura, objeção e tentativas. Inbound mantém prioridade P0 e cancela tarefas de prospecção incompatíveis.

## Playbooks

Fundação inclui bucket privado, playbook, versões, status de análise e princípios estruturados: técnica, objetivo, estágio, aplicação, contraindicação, exemplo e risco. Upload aceita PDF, TXT e MD até 25 MB. Upload não vira template de resposta; ativação exige análise e revisão futura.

## Catálogo e STT

- `SupabaseBuilderCatalogService`: leitura segura de `builders/projects`, sem side effects nem memória inventada.
- `SpeechToTextProvider`: abstração pronta. Provider concreto fica pendente até seleção segura/gratuita.

## Configuração

`/configuracoes/agente` e `/api/agent/brain/config` suportam persona, tom, formalidade, objetividade, didática, persuasão, humor, emoji, tamanho, intensidade comercial, objeções, follow-up, fechamento e preferência de provider/modelo. Autonomia existente continua em `OFF/SUGGEST/APPROVAL/AUTOMATIC` (`disabled/suggest/approval/automatic` no banco).

## Simulation Mode

`/api/agent/brain/simulate` monta contexto real e retorna decisão, avaliação e efeitos simulados. `outboundReal=false`. O pipeline cognitivo não chama gateway nem altera jornada.

## Testes

- 23/23 testes aprovados.
- Fixtures cobrem financiamento, parcela, subsídio, renda, visita, objeções, decisão com cônjuge, documento e pedido humano.
- Lint aprovado.
- TypeScript aprovado.
- Build aprovado, 48 rotas.

## Limitações e próximo passo

- Migration `20260822194555_agent_brain_sprint_c.sql` criada, não aplicada remotamente: checkout sem `SUPABASE_ACCESS_TOKEN`, senha Postgres ou vínculo CLI. APIs dependentes do novo schema não podem ser validadas contra banco remoto antes da aplicação.
- Nenhum provider gratuito real foi configurado; fallback determinístico permanece ativo.
- STT concreto, análise de playbooks, negociação financeira autônoma, aprendizado avançado e ranking de imóveis ficam fora da Sprint C-A.
- Aplicar a migration nova, validar schema/RLS/bucket, executar simulação com cliente teste e verificar visualmente `/configuracoes/agente`.

## Segurança operacional

Número comercial permanece **NO-GO**. Outbound real geral permanece **OFF**. Simulation Mode permanece **ON**. Sprint B.2 não foi alterada.
