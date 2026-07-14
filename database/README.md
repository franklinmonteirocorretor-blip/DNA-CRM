# Database - DNA CRM

Esta pasta contém o schema completo do banco de dados do DNA CRM.

## Estrutura
database/
└── migrations/
└── 0000_producao_completa.sql   ← Script completo (MVP + triggers + RLS)
## Como usar

1. Acesse o **SQL Editor** do seu projeto no Supabase
2. Cole todo o conteúdo do arquivo `migrations/0000_producao_completa.sql`
3. Clique em **Run**

> **Atenção**: Este script já inclui todas as migrações de 0001 até 0007 + Storage policies.

## Observações

- O script foi gerado com base na documentação oficial do projeto.
- Ele cria todas as tabelas, enums, triggers, RLS e a lógica de produção diária automática.
- Recomenda-se rodar este script em um projeto novo do Supabase.

## Próximos passos recomendados

- Após rodar o script, configurar as variáveis de ambiente do Supabase no Next.js
- Criar as políticas de Storage (já incluídas no script)
- Começar o desenvolvimento do frontend
