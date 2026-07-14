# COMO RODAR O BANCO DE DADOS NO SUPABASE
## Guia passo a passo — DNA CRM

**Autor:** Assistentes AI-HUB MONTEIRO
**Data:** 2026-07-13
**Dificuldade:** Iniciante (nao precisa saber programar)

---

## O que este guia faz

Este guia vai te ensinar a rodar o arquivo SQL que cria todo o banco de dados do DNA CRM no Supabase. Em menos de 5 minutos voce tera todas as tabelas, regras de seguranca e automacoes prontas.

---

## Antes de comecar: entenda o que o script vai fazer

O arquivo `database/migrations/0000_producao_completa.sql` e como uma "receita de bolo" que o Supabase vai executar. Ele vai:

1. **Criar 9 tabelas** no seu banco de dados:
   - `usuarios` — corretores, gerentes e administradores
   - `clientes` — leads e clientes do funil de vendas
   - `conjuges` — dados do conjuge (automatico)
   - `atividades` — ligacoes, WhatsApp e follow-ups
   - `agendamentos` — visitas agendadas
   - `comparecimentos` — se o cliente foi ou nao
   - `documentos` — RG, CPF, comprovantes, contratos
   - `producao_diaria` — ranking de desempenho (automatico)
   - `historico_acoes` — auditoria de tudo que acontece

2. **Criar 8 tipos de dados personalizados** (enums):
   - Perfis de usuario: CORRETOR, GERENTE, ADMINISTRADOR
   - Etapas do funil: NOVO_LEAD, CONTATOS, AGENDAMENTO... ate POS_VENDA
   - Tipos de documento, resultado de analise, etc.

3. **Instalar 11 triggers** (gatilhos automaticos):
   - Quando assina ficha proposta -> cliente vai para FECHAMENTOS
   - Quando marca que e casado -> linha do conjuge aparece
   - Cada ligacao/WhatsApp -> conta no ranking diario
   - Toda alteracao -> registrada na auditoria

4. **Configurar RLS** (Row Level Security = seguranca):
   - Cada corretor so ve seus proprios clientes
   - Gerente ve os clientes da equipe dele
   - Admin ve tudo

5. **Criar bucket de documentos** no Storage do Supabase

> Resumo: depois de rodar o script, seu banco de dados esta 100% pronto. E so comecar a usar o sistema.

---

## Passo a passo

### Passo 1 — Abra o Supabase

1. Va para https://supabase.com
2. Clique em **Sign in** (entrar)
3. Entre com o mesmo login que voce usou para criar o projeto
4. Na tela principal, clique no nome do seu projeto

Voce vera um painel como o da imagem abaixo (Dashboard do Supabase).

---

### Passo 2 — Va para o SQL Editor

No menu lateral esquerdo, voce vera varios icones. Procure por:

- **SQL Editor** (icone de terminal/console — quarto icone de cima para baixo)

Clique nele. Vai abrir uma tela com um campo de texto grande onde podemos colar codigo SQL.

> Se nao encontrar, e o icone que parece `</>` com o nome "SQL Editor".

---

### Passo 3 — Abra o arquivo SQL na sua maquina

1. No Windows Explorer, navegue ate:
   ```
   D:\AI-Projects\projects\Development\dna-crm\database\migrations\
   ```

2. Clique com o botao direito no arquivo `0000_producao_completa.sql`

3. Escolha **Abrir com > Bloco de Notas** (ou VS Code se tiver instalado)

4. O arquivo vai abrir. Ele tem 779 linhas — nao se assuste.

---

### Passo 4 — Selecione tudo e copie

1. Dentro do Bloco de Notas (ou VS Code):
   - Pressione `Ctrl + A` (seleciona tudo)
   - Pressione `Ctrl + C` (copia)

> **IMPORTANTE:** Copie o arquivo INTEIRO. Nao selecione so uma parte. O script foi feito para rodar de uma vez.

---

### Passo 5 — Cole no SQL Editor do Supabase

1. Volte para o Supabase (janela do navegador)
2. No SQL Editor, clique dentro do campo de texto grande
3. Pressione `Ctrl + V` (colar)

O texto inteiro do arquivo vai aparecer la. Pode demorar um segundo para colar (sao 779 linhas).

---

### Passo 6 — Execute o script

No canto inferior direito do SQL Editor, voce vera um botao verde:

- **RUN** (ou "Executar", dependendo do idioma)

Clique nele.

> Voce vai ver um circulo girando... Aguarde. O script grande leva entre 5 e 15 segundos para rodar.

Quando terminar, voce vera uma mensagem de **sucesso** (ou Resultados positivos). Se aparecer algum erro em vermelho, NAO se desespere — veja a secao "Se algo der errado" abaixo.

---

### Passo 7 — Verifique se funcionou

No menu lateral esquerdo, clique em **Table Editor** (icone de tabela).

Voce deve ver todas essas tabelas listadas:

- `usuarios`
- `clientes`
- `conjuges`
- `atividades`
- `agendamentos`
- `comparecimentos`
- `documentos`
- `producao_diaria`
- `historico_acoes`

Se todas aparecerem — **PARABENS! Seu banco esta pronto!**

---

### Passo 8 (Opcional) — Verifique o Storage

No menu lateral, clique em **Storage**. Voce deve ver um bucket chamado `documentos`. Se ele aparecer, o armazenamento de arquivos tambem esta configurado.

---

## Avisos importantes de seguranca

### AVISO 1: Rode em um banco LIMPO

Este script foi feito para rodar em um projeto NOVO do Supabase. Se voce ja tem tabelas com os mesmos nomes (`clientes`, `usuarios`, etc.), o script vai dar ERRO.

> **Regra:** rode apenas UMA vez em um banco vazio. Nao rode duas vezes no mesmo banco.

### AVISO 2: O script e DESTRUTIVO se re-executado

Se voce rodar este script em um banco que ja tem dados, algumas partes podem FALHAR (como `create type` e `create table`) porque tipos e tabelas ja existem. Os dados existentes NAO serao apagados — mas o script vai parar no meio com erro.

> Se precisar recriar tudo do zero, va em **Project Settings > Database > Reset Database** (isso apaga TUDO — cuidado!).

### AVISO 3: O bucket de documentos e PRIVADO

O bucket `documentos` criado pelo script e configurado como **privado** (`public: false`). Isso significa que:

- So usuarios autenticados pelo Supabase podem ver os arquivos
- Cada corretor so acessa documentos dos SEUS clientes
- Ninguem de fora consegue acessar sem login

> Isso e o comportamento CORRETO para documentos sensiveis como RG, CPF e comprovantes de renda.

### AVISO 4: Seu projeto ja tem URL e chaves configuradas

Voce ja configurou as variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`. Depois de rodar o script, o Next.js ja consegue conversar com as tabelas novas. Nao precisa mexer em nada.

---

## Se algo der errado

### Erro: "relation already exists"

**Traducao:** "essa tabela ja existe"

**Causa:** voce ja rodou o script antes, ou alguem criou tabelas com esses nomes.

**Solucao:**
1. Va em **Project Settings** (icone de engrenagem no menu inferior)
2. Clique em **Database**
3. Role ate encontrar **Reset Database**
4. Leia o aviso com atencao (isso APAGA tudo)
5. Se tiver certeza, clique em **Reset**
6. Volte para o SQL Editor e rode o script novamente

> So faca isso se o banco estiver VAZIO. Se ja tem dados importantes, fale com um desenvolvedor antes.

### Erro: "permission denied"

**Traducao:** "acesso negado"

**Causa:** voce esta tentando rodar fora do SQL Editor do Supabase.

**Solucao:** O script SO funciona no SQL Editor do Supabase. Nao tente rodar em outro programa (DBeaver, pgAdmin, etc.) porque ele usa funcoes especificas do Supabase (`auth.uid()`).

---

## Resumo em 3 passos (para quem ja leu o guia)

1. Abrir `0000_producao_completa.sql` no Bloco de Notas
2. Copiar tudo (`Ctrl+A`, `Ctrl+C`)
3. Colar no SQL Editor do Supabase e clicar **RUN**

Pronto. Em 15 segundos seu banco esta 100% funcional.

---

## Proximos passos apos rodar o script

Depois que o banco estiver pronto:

1. **Teste o login:** abra o sistema Next.js e faca login com uma conta criada no Supabase Auth
2. **Crie o primeiro admin:** no SQL Editor, rode:
   ```sql
   update public.usuarios set perfil = 'ADMINISTRADOR'
   where email = 'seu-email@aqui.com';
   ```
3. **Comece a cadastrar leads** direto pelo sistema

---

## Duvidas?

Se algo nao funcionar como esperado, fale comigo (assistente AI-HUB) ou abra o arquivo `WORKFLOW.md` na raiz do projeto para mais contexto.

---

**Fim do guia. Boa execucao!**