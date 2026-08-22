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
