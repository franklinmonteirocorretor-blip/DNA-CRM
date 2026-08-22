# Sprint C-A — cérebro comercial do Agente Monteiro

Atualizado em: 22/08/2026

Status: **Sprint C-B implementada e validada localmente e contra o Supabase remoto**.

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

## Validação Sprint C-B

- As cinco migrations Sprint C foram aplicadas e confirmadas no ledger remoto; a corretiva remota consta como `20260822204113_harden_agent_brain_runtime_contracts`.
- RLS ativo; tabelas sensíveis sem acesso `anon`/`authenticated` e com acesso `service_role`.
- Memória e resumo usam RPC transacional com lock; falha intermediária forçada confirmou rollback integral.
- Resumos são isolados por conversa; origem de mensagem divergente é rejeitada.
- Upload TXT, MD e PDF e limpeza passaram no runtime. Ativação de arquivo cru agora retorna `409`: exige análise concluída, princípios presentes e revisão humana. DOCX não é formato permitido.
- Configuração parcial preserva campos omitidos e rejeita campos desconhecidos/fora de faixa.
- Providers persistem apenas referência de variável de ambiente; segredo em texto puro é rejeitado.
- Modos `AUTO`, `HUMAN_TAKEOVER`, `OBSERVE_ONLY` e `PAUSED` preservam extração; somente `AUTO` pode propor mensagem.
- CRM permaneceu operacional com agente global desabilitado: clientes, agenda, documentos, análises, financeiro, catálogo e CCA responderam `200`.
- Tela `/configuracoes/agente` validada visualmente e sem erros de console.
- 28/28 testes aprovados.
- Fixtures cobrem financiamento, parcela, subsídio, renda, visita, objeções, decisão com cônjuge, documento e pedido humano.
- Lint aprovado.
- TypeScript aprovado.
- Build aprovado, 49 rotas.

## Pesquisa de provider e STT

- **Recomendação de protótipo:** Groq Free, inicialmente somente com fixtures anonimizadas. O endpoint é OpenAI-compatible; `openai/gpt-oss-120b` oferece no plano Free 30 RPM/1.000 RPD, e Whisper oferece 20 RPM/2.000 RPD.
- **STT:** `whisper-large-v3-turbo` é multilíngue, aceita até 25 MB no Free e custa menos no plano pago. Integração concreta ainda não foi iniciada.
- **Gemini Free:** rejeitado para dados reais de cliente nesta fase; a página oficial informa que conteúdo do Free pode ser usado para melhorar produtos.
- **OpenRouter Free:** adequado a experimento, não runtime principal; limite padrão de 50 requisições/dia e disponibilidade reduzida.
- Nenhum provider real foi configurado. Fallback determinístico permanece ativo.
- Privacidade, retenção, contrato e teste PT-BR precisam ser aprovados antes de enviar PII. Sprint C-C não foi iniciada.

## Segurança operacional

Número comercial permanece **NO-GO**. Outbound real geral permanece **OFF**. Simulation Mode permanece **ON**. Sprint B.2 não foi alterada.
