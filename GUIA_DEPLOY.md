# Guia de Deploy — DNA CRM v1.0

## 1. Pré-requisitos

- Conta no Vercel (https://vercel.com)
- Conta no Supabase (https://supabase.com)
- Repositório GitHub configurado: `franklinmonteirocorretor-blip/DNA-CRM`

## 2. Deploy no Vercel

### Passo 1: Conectar repositório
1. Faça login no Vercel
2. Clique "Import Project"
3. Selecione o repositório GitHub `DNA-CRM`
4. Confirme o Framework: Next.js

### Passo 2: Configurar variáveis de ambiente
No dashboard do Vercel, configure as mesmas 3 variáveis:

| Nome | Tipo | Fonte |
|------|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Supabase Project API Keys → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta | Supabase Project API Keys → service_role key |

### Passo 3: Deploy
1. Clique "Deploy"
2. Aguarde ~2 minutos
3. URL será fornecida (ex: dna-crm.vercel.app)

## 3. Banco de Dados

O banco está no Supabase (não no Vercel). As migrations já estão aplicadas.

### Migrações manuais (se necessário)
1. Acesse o Supabase SQL Editor
2. Execute as migrations em ordem (0000 → 0034)
3. Verifique RLS, triggers, funções

## 4. Verificação pós-deploy

- [ ] Página inicial carrega
- [ ] Login funciona
- [ ] Dashboard carrega dados do Supabase
- [ ] Pipeline e funil abrem
- [ ] Documentos upam
- [ ] WhatsApp e Copiloto abrem
- [ ] Realtime (Central Operações) funciona
- [ ] Cron jobs executam (verificar /api/cron/automacao)

## 5. Domínio customizado

No Vercel → Settings → Domains:
1. Adicionar domínio: `dna.seudominio.com.br`
2. Configurar DNS com CNAME para `cname.vercel-dns.com`
3. Aguardar SSL provisioning

## 6. Urls de Produção

- Vercel: https://dna-crm-*.vercel.app (gerada no deploy)
- Domínio: https://dna.seudominio.com.br (após configurar)

## 7. Maintenance

- Build trigger: push no branch `main`
- Rollback: Vercel dashboard → Deployments → "Promote to Production" em qualquer deployment antigo
- Logs: Vercel → Deployments → Logs tab
- Monitoria: Vercel Analytics