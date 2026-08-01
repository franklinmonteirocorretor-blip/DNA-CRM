# Contributing — DNA CRM

## Bem-vindo

Obrigado por considerar contribuir com o DNA CRM! O projeto está na fase de manutenção — apenas correções de bugs e melhorias pequenas. Todo desenvolvimento futuro estará no projeto **Monteiro — Negócios Imobiliários**.

## Como Contribuir

1. **Fork** o repositório
2. Crie uma **branch** com prefixo de tarefa: `fix/`, `docs/`, `chore/`
3. Faça **commit** com mensagem descritiva e curta (50 chars no título, até 72 no corpo)
4. Abra um **Pull Request** com descrição do problema e da corrigir

## Regras

- Nenhuma funcionalidade nova deve ser adicionada ao DNA CRM v1.x
- Correções devem ser acompanhadas de teste unitário (quando aplicável)
- TypeScript deve manter 0 erros
- ESLint deve manter 0 erros
- Build deve ser limpo (next build sem falhas)

## Ambiente de Desenvolvimento

```bash
git clone <fork>
npm install
npm run dev
```

## Review

- Todo PR precisa de aprovação de um mantenedor
- CI (build + lint + test) deve passar

## Licença

Ao contribuir, você aceita que seus trabalhos estarão sob a licença MIT.

---