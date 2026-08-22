# Sprint B.1 — Relatório de validação

Data: 16/08/2026

## Entregue

- Gateway Node isolado em `apps/whatsapp-gateway`.
- Baileys fixado em `7.0.0-rc14`.
- API autenticada: health, create, status, connect, disconnect, reconnect e QR.
- Lifecycle: created, waiting_qr, connecting, connected, reconnecting, disconnected e failed.
- Auth state SQL próprio; `useMultiFileAuthState` removido.
- Creds e Signal keys cifradas com AES-256-GCM, IV aleatório e tag de autenticação.
- Heartbeat, backoff exponencial e circuit breaker na quinta falha.
- QR somente em memória, com expiração; CRM recebe somente data URL pelo backend.
- Interface em `/configuracoes/whatsapp` com status, telefone, atividade, erro e controles.
- Human Takeover preservado: AUTO, HUMAN_TAKEOVER, OBSERVE_ONLY e PAUSED.
- Simulation Mode e outbound kill switch preservados.
- `render.yaml` com auto-deploy desligado e `/health`.
- Migration `agent_whatsapp_sprint_b` aplicada no projeto Supabase `pdrvmdfqihnlzztsapwt`.

## Validação concluída

- Gateway TypeScript build: aprovado.
- Gateway tests: 3/3 aprovados.
- Gateway audit de dependências de produção: 0 vulnerabilidades.
- CRM tests: 10/10 aprovados.
- CRM lint: aprovado.
- CRM build: aprovado, 44 rotas.
- Verificação visual local da tela WhatsApp: aprovada, sem erro de console.
- Migration relida no histórico remoto e colunas B.1 confirmadas.
- Security Advisor: apenas avisos informativos de RLS sem policy; tabelas são service-only, com grants de anon/authenticated revogados.

## Bloqueios externos

- `.env.local` ainda possui chave JWT legada de 43 caracteres. Ela não foi usada no gateway. Rotação remota precisa ser comprovada e o arquivo local precisa receber `sb_secret_...` válida ou ser saneado.
- Render ainda não possui serviço/configuração deste gateway.
- `WHATSAPP_GATEWAY_SECRET`, `WHATSAPP_AUTH_ENCRYPTION_KEY` e URL do Render ainda não foram configurados nos dois ambientes.
- Conta e número de teste não foram vinculados por QR.

## Testes reais não executados

- Restart/restauração de sessão.
- Perda de rede/reconnect.
- Invalidação e novo QR.
- Inbound DM, áudio e documento.
- Outbound para número autorizado.
- Human Takeover com tráfego real.
- Soak de 24 horas.

## Baileys rc14

Nenhum bug de compilação ou contrato de tipos encontrado. Não há resultado runtime real suficiente para afirmar estabilidade da rc14.

## Decisão

**NO-GO para número comercial.** Código e banco formam base funcional, mas gates Render, segredo rotacionado, conta de teste e soak ainda não passaram.
