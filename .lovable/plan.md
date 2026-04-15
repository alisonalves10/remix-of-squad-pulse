

# Corrigir Dashboard Geral: Horas em vez de Story Points + Dados Consistentes

## Problemas identificados

1. **"pts" em vez de "h"**: A tabela SquadsTable exibe `velocity pts` (linha 67) e o gráfico de barras mostra tooltip "Story Points" (VelocityChart linha 47). Tudo precisa ser em horas.

2. **Dados inconsistentes**: O dashboard usa a sprint mais recente de cada squad (incluindo sprints em andamento com poucos dados). Por exemplo, Backoffice Sprint 10 tem apenas 2h concluídas, dando uma visão distorcida. Deveria usar a **última sprint fechada** (`is_closed = true`) para métricas confiáveis na tabela e KPIs.

3. **Spillover e Bugs zerados**: Como pega sprints em andamento (Sprint 8, 9, 10), ainda não há bugs nem spillover detectado. Usando a última sprint fechada, os dados serão consistentes com o que a página de sprint mostra.

## Mudanças

### `src/hooks/useDashboardData.ts`
- Alterar `latestSprintBySquad` para pegar a última sprint **fechada** (`is_closed === true`) em vez da última sprint absoluta
- Fallback: se não houver sprint fechada, usar a mais recente

### `src/components/dashboard/SquadsTable.tsx`
- Linha 67: trocar `{squad.velocity} pts` por `{squad.velocity}h`

### `src/components/dashboard/VelocityChart.tsx`
- Linha 47: trocar `name="Story Points"` por `name="Horas"`

### `src/pages/Index.tsx`
- Sem mudanças estruturais (já usa "h" nos KPIs)

## Arquivos alterados
- `src/hooks/useDashboardData.ts` — priorizar última sprint fechada
- `src/components/dashboard/SquadsTable.tsx` — "pts" → "h"
- `src/components/dashboard/VelocityChart.tsx` — "Story Points" → "Horas"

