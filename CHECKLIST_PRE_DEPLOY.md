# Checklist Deploy — DNA CRM v1.0

## Pré-Implantação (antes de deploy)

### Ambiente

- [ ] Projeto clonado no servidor de produção
- [ ] Variáveis de ambiente configuradas em `.env.local`:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (NUNCA prefixado com `NEXT_PUBLIC_`)
- [ ]  `.env.local` NÃO commitado no git (já no .gitignore)
- [ ]  Repositório configurado para deploy (Vercel, Netlify, Docker)

### Database

- [ ] Banco Supabase criado e vinculado ao projeto `.env.local`
- [ ] Organização Supabase configurada (projeto + equipe)
- [ ] Migrações aplicadas na ordem correta: rodar `0000` primeiro, depois `0001` a `0034`
- [ ] RLS habilitado em todas as tabelas (`alter table ... enable row level security`)
- [ ] Políticas de segurança revisadas (checked via `select * from pg_policies`)
- [ ] Triggers ativados (verificar se todos existem no Supabase)

### Auth

- [ ] Provedor de login configurado (email + opcional Google OAuth)
- [ ] Usuário admin criado (via Supabase Auth ou script)
- [ ] Estrutura de permissão testada:
  - [ ] Administrador pode ver tudo
  - [ ] Gerente vê módulos gerenciais
  - [ ] Supervisor vê métricas de equipe
  - [ ] Corretor vê apenas seus dados

### Storage

- [ ] Bucket configurado (se necessário) em Supabase Storage
- [ ] Políticas de acesso configuradas (upload/download por usuário autenticado)
- [ ] Verificar permissão de leitura/escrita

### Realtime

- [ ] Verificar se `ALTER PUBLICATION supabase_realtime ADD TABLE ...` foi rodado para:
  - pragas_inf (atividades)
  - producao_diaria
  - notificacoes
  - semáforos_contatos_whatsapp (whatsapp_conversas)
  - whatsapp_mensagens

### Cron Jobs (pg_cron)

- [ ] Verificar se pg_cron está habilitado (no Supabase dashboard)
- [ ] Funções programadas executando:
  - cobrar_notificacoes ()

### Backup

- [ ] Estratégia de backup definida (daily, weekly, monthly)
- [ ] Roteiro de restauração documentado
- [ ] Teste de restauração bem-sucedido

### Variáveis de Ambiente

- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_*` itens revisados para ensure sem dados sensíveis
- [ ] Sem conteúdos comprometidos em `.env.local`

### URLs

- [ ] Domain configurado (ex: dna.seudominio.com.br)
- [ ] HTTPS habilitado

---

## Pós-Implantação (Depois do deploy)

- [ ] Primeiro login administrativo funcionando
- [ ] Flask 200/302 HTTP (sem erros 500) em todas as páginas principais
- [ ] Login funciona com todos os perfis
- [ ] RLS impede leitura entre organizações (verificação manual)
- [ ] Interface carrega em celular (mobile) e desktop
- [ ] Dark Mode alterna sem erros
- [ ] Pages que usam lazy loading ou Suspense carregam sem falhas
- [ ] Logs de erro em 0 (console)
- [ ] Rate limiter configurado no Supabase-ish

---

## Segurança

- [ ] Todas ações de servidor protegidas com `requireAuth()`
- [ ] API routes protegidas (ver arquivo `app/api/*`)
- [ ] CSRF configurado
- [ ] Headers de segurança em Next.js configurados