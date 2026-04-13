

# Fix: Sprint 7 faltando + gráficos burndown/burnup não carregam

## Problema 1: Sprint 7 ausente para 4 times
A Sprint 7 está faltando para **Backoffice, Sellers e Produtos, Arquitetura e Inovação, E-Commerce**. Isso ocorreu porque a sincronização histórica desses times falhou com "Failed to fetch" (timeout de 5 min excedido para processar 23 iterações por time).

**Causa raiz**: a edge function tenta sincronizar todas as 23 iterações de 2026 numa única chamada, e para times com muitos work items, isso excede o timeout.

**Solução**: No frontend (`src/pages/Settings.tsx`), ao usar `syncAllIterations`, limitar o envio a **lotes menores** — enviar as iterações em grupos (ex: 5 por chamada) ou enviar uma iteração por chamada. Alternativa mais simples: apenas re-executar a sincronização histórica para os times que falharam, pois os dados já parcialmente sincronizados são preservados (upsert).

Na prática, a correção mais efetiva é **dividir as iterações no lado do edge function**: aceitar um parâmetro `maxIterations` ou processar em chunks internamente, respondendo antes do timeout.

## Problema 2: Gráficos burndown/burnup não renderizam
Os componentes `BurndownChart` e `BurnupChart` declaram interfaces com tipos `number`, mas o hook `useSprintDetailData` retorna `number | null` nos campos `remaining`, `completed` e `scope`. O Recharts não renderiza linhas quando recebe `null` em campos tipados como `number`.

**Solução**: Atualizar as interfaces dos dois componentes para aceitar `number | null`:

- **`BurndownChart.tsx`**: Mudar `remaining: number` para `remaining: number | null`
- **`BurnupChart.tsx`**: Mudar `completed: number` e `scope: number` para `number | null`

## Arquivos alterados
1. `src/components/dashboard/BurndownChart.tsx` — interface aceitar `null`
2. `src/components/dashboard/BurnupChart.tsx` — interface aceitar `null`
3. `supabase/functions/azure-sync/index.ts` — dividir iterações em chunks de 5 para evitar timeout
4. `src/pages/Settings.tsx` — aumentar timeout do fetch para histórico ou enviar iterações individualmente

## Impacto
- Gráficos passam a renderizar corretamente para todas as sprints com dados
- Sincronização histórica não excede mais o timeout de 5 minutos

