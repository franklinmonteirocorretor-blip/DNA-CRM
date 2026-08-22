# Portabilidade do Monteiro WhatsApp Gateway

## Arquitetura

O CRM na Vercel acessa o gateway por HTTPS através de `WHATSAPP_GATEWAY_URL` e `WHATSAPP_GATEWAY_SECRET`. O container executa Node 22 e Baileys. Supabase é a fonte canônica de sessões, auth state criptografado, Signal keys, conversas, mensagens, eventos, auditorias, tarefas e mídia.

Back4App, Render, Vultr ou uma máquina local são apenas runtimes do mesmo container. Nenhum estado crítico depende do filesystem do runtime.

## Dependências externas

- Supabase Database e Storage.
- Endpoint inbound do CRM na Vercel.
- WhatsApp Linked Devices por Baileys.
- HTTPS fornecido pelo runtime atual ou por Caddy em VPS.

## Variáveis

Obrigatórias: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `WHATSAPP_GATEWAY_SECRET` e `WHATSAPP_AUTH_ENCRYPTION_KEY`.

Operacionais: `NODE_ENV`, `PORT`, `CRM_INBOUND_URL`, `WHATSAPP_AUTHORIZED_TEST_NUMBERS`, `WHATSAPP_REAL_OUTBOUND_ENABLED`, `WHATSAPP_MEDIA_BUCKET` e `WHATSAPP_CIRCUIT_COOLDOWN_MS`.

Segredos nunca entram no Git, imagem Docker, logs ou documentação. Outbound permanece `false` por padrão.

## Back4App atual

Use `deploy/back4app/README.md`. O plano Free oferece 0.25 CPU e 256 MB RAM. O gate exige provar memória real, continuidade e restauração; existência do plano não prova adequação comercial.

## Vultr futuro

Use `deploy/vultr/docker-compose.yml` e `deploy/vultr/Caddyfile` em Ubuntu com Docker Compose, firewall liberando somente SSH, HTTP para emissão TLS quando necessário e HTTPS. O gateway permanece acessível apenas pelo loopback do host; Caddy termina TLS.

## Migração Back4App para Vultr

1. Criar e proteger a VPS.
2. Instalar Docker e Docker Compose.
3. Subir a mesma revisão da imagem com outbound desligado.
4. Validar `/health` sem iniciar dois sockets.
5. Parar o gateway Back4App e confirmar encerramento.
6. Iniciar o gateway Vultr e restaurar a sessão pelo Supabase.
7. Confirmar `CONNECTED` sem QR e sem mudança de identidade.
8. Atualizar `WHATSAPP_GATEWAY_URL` na Vercel.
9. Executar smoke tests somente com conta de teste.
10. Remover Back4App após validação completa.

Ordem obrigatória: `OLD_GATEWAY STOP`, depois `NEW_GATEWAY RESTORE`. Dois gateways nunca controlam a mesma sessão simultaneamente.

## Rollback

1. Parar Vultr e confirmar socket encerrado.
2. Restaurar `WHATSAPP_GATEWAY_URL` anterior.
3. Iniciar Back4App.
4. Confirmar restore sem QR e executar smoke tests.

## Session ownership

Lease distribuído ainda não foi implementado. Evolução prevista: `session_id`, `owner_instance_id`, `lease_expires_at` e heartbeat; somente dono com lease válido abre o socket. Até isso existir, runbook com parada confirmada do runtime antigo é controle obrigatório.

## Provedor WhatsApp

CRM já depende do contrato `WhatsAppProvider` e do gateway HTTP, não de Baileys diretamente. No processo do gateway, `SessionManager` ainda usa Baileys diretamente. Troca futura para API oficial exige extrair esse adapter interno; isso não é necessário para trocar Back4App por Vultr e não será misturado com Sprint B.2.

## Observabilidade

`GET /health` público expõe disponibilidade, uptime, estado do outbound e memória RSS/heap. Com Bearer secret válido, inclui estados de sessão, heartbeat mais recente, reconnect total, circuit breaker e último erro persistido. Logs estruturados usam stdout/stderr.

## Riscos atuais

- Back4App Free é descrito pelo fornecedor como plano para testes e aprendizado; continuidade de 24 horas precisa ser provada por soak real.
- 256 MB podem causar OOM; usar limite de heap e medir RSS real.
- Sem lease, execução concorrente em dois runtimes pode corromper a sessão.
- Build e execução local do container dependem de Docker disponível; TypeScript/testes não substituem prova do container.
