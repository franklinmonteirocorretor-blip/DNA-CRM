# Disparador Inteligente WhatsApp

## Estado em 22/08/2026

O módulo está implementado para configuração, seleção, preview e ciclo de campanha em Dry Run. O schema foi aplicado no Supabase canônico. Outbound real permanece bloqueado no CRM e na função de transição do banco.

## Componentes

- Carteira do Dia: painel do disparador, filtros, limites, janela, distribuição de modelos, preview e controles de campanha.
- Configurações > WhatsApp > Abordagens: cadências, abordagens e modelos versionados.
- API autenticada: `/api/whatsapp-dispatcher` e `/api/whatsapp-dispatcher/library`.
- Motor puro: elegibilidade, placeholders confirmados, distribuição determinística, agenda, idempotência e Dry Run.
- Supabase: 12 tabelas service-only, fila, cadência por cliente, labels operacionais e RPCs de lifecycle/reply/Dry Run.
- Inbound: resposta do cliente interrompe itens pendentes da campanha. Itens em envio não são falsamente marcados como cancelados.

## Segurança

- Agent Brain pausado por padrão. Só executa com `AGENT_BRAIN_ENABLED=true`.
- Preview não chama gateway nem persiste envio.
- Campanha real não inicia: `REAL_DISPATCH_WORKER_NOT_VALIDATED`.
- Outbound geral OFF, número comercial proibido, Simulation Mode preservado.
- Tabelas com RLS; `anon` e `authenticated` sem acesso; RPCs somente `service_role`.
- Placeholders sem fato confirmado bloqueiam o item.
- `do_not_contact`, opt-out, `can_contact`, identidade, Kill Switch e idempotência entram na elegibilidade.

## Evidência

- Schema remoto: 12/12 tabelas encontradas.
- Três RPCs: `security invoker`; execução negada a `anon`/`authenticated`, permitida a `service_role`.
- Testes do motor: 7/7 aprovados.
- ESLint do escopo, TypeScript e `git diff --check`: aprovados antes da aplicação remota.

## Pendente para outbound real

- Worker durável no gateway Node com claim/lease e revalidação imediatamente antes do envio.
- Upload e envio real de imagem, vídeo e documento.
- ACK real do provedor e read-back persistido; HTTP aceito não conta como ACK.
- Testes de concorrência: pause/stop/reply durante envio, restart, retry e falha de mídia.
- Teste allowlisted específico, somente após autorização, seguido de retorno a OFF.
- Gates B.2 restantes e GO/NO-GO formal. Número comercial continua NO-GO.

## Runtime worker implementado em 22/08/2026

- Worker durável integrado ao processo Node do gateway; inicia após restauração das sessões e encerra antes do socket.
- Ativação exige simultaneamente `WHATSAPP_DISPATCH_WORKER_ENABLED=true`, `WHATSAPP_REAL_OUTBOUND_ENABLED=true` e allowlist de teste não vazia. Padrão permanece desligado.
- Banco adiciona autorização operacional expirada e vinculada a uma única sessão via `configure_whatsapp_dispatch_runtime`; o registro remoto nasceu `real_enabled=false`, sem sessão e sem validade.
- Endpoint outbound legado fica desativado por padrão; só existe com flag separada.
- Claim atômico usa `FOR UPDATE SKIP LOCKED`, `worker_id`, lease renovável e recuperação após expiração.
- Claim limitado a um item. Batch, intervalo, pausa, janela e limites persistem no Supabase.
- Campanhas reais aceitam somente 1–5 IDs de clientes de teste persistidos na campanha e sessão explicitamente configurada.
- Revalidação pré-envio cobre campanha, Kill Switch, contato, opt-out, sessão, identidade, Human Takeover, reply, janela e limites.
- Provider suporta texto, imagem, vídeo e documento a partir do bucket privado, sempre sob flag e allowlist.
- ACK real é observado por `messages.update`. Aceitação é persistida antes da espera do ACK; timeout vira `WAITING_RECONCILIATION`, sem retry cego.
- Finalização exige ACK do servidor, mensagem persistida e read-back no banco para mídia e texto.
- Disconnect gera `PAUSED_SYSTEM`; retorno exige resume manual.

## Evidência runtime

- CRM: 85/85 testes aprovados; lint, TypeScript e build (51 rotas) aprovados.
- Gateway: build e 9/9 testes aprovados; audit sem vulnerabilidades.
- Gateway: build e 7/7 testes aprovados.
- Dois workers simulados: um claim e um envio lógico.
- Reply/revalidação negada: zero chamada ao provider.
- Timeout de ACK: reconciliação, zero retry cego.
- Disconnect: `PAUSED_SYSTEM`, zero chamada ao provider.
- Supabase remoto: `CLAIM_LEASE_CONCURRENCY_PASS` e `REAL_TEST_MATERIALIZATION_PASS`, ambos em transações com rollback.
- Nenhum outbound real executado. Back4App não foi redeployado; worker remoto continua ausente e flags continuam OFF.

## Limitação física

Entre a última revalidação transacional e a chamada externa ao WhatsApp existe uma janela inevitável. Resposta recebida exatamente nessa janela pode não impedir o envio já iniciado. O worker reduz a janela e nunca repete resultado ambíguo, mas garantia matemática de zero envio nessa corrida exige suporte transacional/idempotente do próprio provedor, inexistente no Baileys.
