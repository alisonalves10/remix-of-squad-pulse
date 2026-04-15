

# Corrigir lógica de "Sprint Atual" — basear na data, não em `is_closed`

## Problema
Atualmente, a definição de "sprint em andamento" varia entre arquivos: alguns usam `is_closed === false`, outros pegam o `sprints[0]` (mais recente por data). A regra correta é: **sprint em andamento = a sprint cuja `start_date <= hoje <= end_date`**. Hoje é 2026-04-15, então apenas "2026 - Sprint 8" (se seu range inclui hoje) deve ser considerada em andamento.

## Mudanças

### 1. Criar helper reutilizável `src/lib/sprint-utils.ts`
```typescript
export function isSprintActive(sprint: { start_date: string; end_date: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return sprint.start_date <= today && sprint.end_date >= today;
}

export function getCurrentSprint<T extends { start_date: string; end_date: string }>(sprints: T[]): T | undefined {
  return sprints.find(s => isSprintActive(s));
}
```

### 2. `src/pages/Squads.tsx` (linha 32)
- Trocar `const currentSprint = sprints[0]` por `const currentSprint = getCurrentSprint(sprints) || sprints[0]`
- Trocar label "Em andamento" (linha 93) por verificação com `isSprintActive(sp)`

### 3. `src/hooks/useSprintDetailData.ts` (linha 42)
- Já usa verificação por data (`start_date <= todayStr && end_date >= todayStr`), mas também exige `!s.is_closed`. Remover a dependência de `is_closed` para determinar sprint ativa — usar apenas data.

### 4. `src/hooks/useDashboardData.ts` (fallback sem filtro de sprint)
- Na lógica de "última sprint fechada", definir "fechada" como sprint cuja `end_date < hoje` (em vez de depender só de `is_closed`). Sprints com `end_date >= hoje` são consideradas em andamento.

### 5. `src/pages/Sprints.tsx` (linha 69-70)
- Trocar `!data.sprint.is_closed && data.sprint.end_date >= todayStr` por `isSprintActive(data.sprint)`

## Arquivos alterados
- **`src/lib/sprint-utils.ts`** — novo helper
- **`src/pages/Squads.tsx`** — usar `getCurrentSprint` e `isSprintActive`
- **`src/hooks/useSprintDetailData.ts`** — usar apenas data para sprint ativa
- **`src/hooks/useDashboardData.ts`** — definir "fechada" por `end_date < hoje`
- **`src/pages/Sprints.tsx`** — usar `isSprintActive`

