

# Filtrar sprints futuras de toda a aplicação

## Problema
O filtro de sprint no dashboard e listagens inclui sprints futuras (ex: "2026 - Sprint 9", "2026 - Sprint 10") que ainda não começaram. Essas não devem aparecer.

## Mudanças

### `src/hooks/useDashboardData.ts` (linha 28-33)
- Filtrar sprints cujo `start_date > hoje` antes de popular `sprintNamesSet`
- Apenas sprints com `start_date <= hoje` entram na lista `allSprintNames`

### `src/pages/Squads.tsx`
- Na listagem de sprints da squad, filtrar sprints futuras (`start_date > hoje`) para não exibi-las na tabela/seletor

### `src/lib/sprint-utils.ts`
- Adicionar helper `isSprintFuture(sprint)` que retorna `true` se `start_date > hoje`

## Arquivos alterados
- `src/lib/sprint-utils.ts` — novo helper `isSprintFuture`
- `src/hooks/useDashboardData.ts` — excluir sprints futuras do filtro
- `src/pages/Squads.tsx` — não exibir sprints futuras

