# SWE-Bench Dashboard — User Story

## Persona
**Nome**: Alex Torres  
**Cargo**: Tech Lead / ML Engineer  
**Objetivo**: Comparar modelos de linguagem em tarefas de engenharia de software, identificar os melhores performers, e tomar decisões baseadas em dados para escolha de ferramentas de coding assistant.

## User Story

### Epic: Visualização de Leaderboard SWE-Bench

**Como** Tech Lead avaliando modelos de código,  
**Quero** um dashboard que exiba resultados de SWE-Bench em formato de leaderboard,  
**Para que** eu possa comparar modelos por benchmarks, métricas e tomar decisões informadas sobre qual stack adotar.

---

## Critérios de Aceitação

### AC-1: Leaderboard Principal
- Exibir tabela ranqueada com nome do modelo, resolved rate, métricas de desempenho
- Ordenação por score padrão decrescente
- Suporte a ordenação por qualquer coluna com indicador visual

### AC-2: Filtros
- Filtro por benchmark (SWE-Bench Verified, SWE-Bench Lite, SWE-Bench Full)
- Filtro por modelo (seleção múltipla ou busca textual)
- Filtro por métrica (resolved rate, average time, etc.)
- Filtros aplicados simultaneamente com feedback visual

### AC-3: Pesquisa
- Campo de busca textual que filtra modelos da tabela em tempo real
- Debounce de 300ms para evitar chamadas excessivas

### AC-4: Paginação
- Listagem paginada com 10, 25 ou 50 itens por página
- Navegação: anterior, próxima, primeira, última
- Indicador de página atual e total de resultados

### AC-5: KPIs de Resumo
- Card com total de modelos avaliados
- Card com melhor score global
- Card com média de resolved rate
- Card com último benchmark adicionado

### AC-6: Responsividade
- Layout adaptável: tabela horizontal em desktop, cards compactos em mobile
- Filtros colapsáveis em mobile
- Touch-friendly em todas as interações

### AC-7: Dark Mode
- Suporte completo ao tema escuro
- Persistência de preferência via localStorage
- Respeito à preferência do sistema (prefers-color-scheme)

### AC-8: Performance
- Carregamento inicial < 2 segundos
- Paginação instantânea
- Mudança de filtros suave ou com skeleton
- Sem jank visual durante transições

### AC-9: Acessibilidade (WCAG AA)
- Navegação completa via teclado (tab, arrows, enter, esc)
- Leitor de tela funcional com anúncios de mudança
- Contraste ≥ 4.5:1 texto normal, ≥ 3:1 texto grande
- Foco visível em todos os elementos interativos
- Landmarks semânticas (header, main, nav, aside)
- Texto alternativo em KPIs

---

## Cenários de Uso

### Cenário 1: Comparação Rápida
1. Maria acessa o dashboard
2. Vê tabela principal de leaderboard
3. Identifica top 3 modelos pelo score
4. Usa pesquisa para filtrar por modelo específico (scroll/instantâneo)
5. Clica no nome do modelo para ver detalhes (futuro)

### Cenário 2: Análise por Benchmark
1. Maria seleciona o filtro "SWE-Bench Verified"
2. Tabela filtra para resultados apenas desse benchmark
3. Adiciona filtro de métrica "≥ 50% resolved rate"
4. Visualiza apenas modelos que atendem aos critérios
5. Ordena por tempo de execução para ver o mais rápido entre os que passam

### Cenário 3: Mobile On-the-Go
1. Maria acessa pelo celular em trânsito
2. Dashboard exibe KPIs em cards horizontais
3. Tabela se converte em cards modelo-a-modelo
4. Filtros colapsam em bottom sheet
5. Maria escolhe apenas "Claude" para ver seus benchmarks