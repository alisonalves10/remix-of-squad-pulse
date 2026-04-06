

# Plan: Replace mock data on Dashboard Geral with real database data

## What changes

Replace all mock data imports in `src/pages/Index.tsx` with real data fetched from the database using the existing `useSquadsData.ts` hooks pattern.

## Implementation

### 1. Create `src/hooks/useDashboardData.ts`
A new hook that fetches all data needed for the Dashboard Geral:
- Fetch all squads from `squads` table
- Fetch all sprints from `sprints` table
- Fetch all metrics from `metrics_snapshot` table  
- Fetch all work items from `work_items` table
- Compute aggregate KPIs from real data:
  - **Squads Monitoradas**: count of squads
  - **Velocidade Média**: average `completed_points` across latest sprint per squad
  - **Comprometimento**: average `(completed_points / planned_points) * 100`
  - **Spillover**: percentage of work items with `is_spillover = true`
  - **Taxa de Bugs**: `bugs_created / (bugs_created + bugs_resolved) * 100` from metrics
- Build velocity-by-squad chart data: each squad's `completed_points` from current sprint
- Build velocity trend chart data: `completed_points` and `planned_points` per sprint over time

### 2. Update `src/pages/Index.tsx`
- Remove all `mock-data` imports
- Use the new `useDashboardData` hook
- Add loading/empty states (skeleton or message when no data)
- Feed real computed values into KPICards, VelocityChart, TrendChart, and SquadsTable
- Adapt SquadsTable data to match its expected interface (id, name, velocity, commitment, spillover, trend)

### 3. Update `src/components/dashboard/SquadsTable.tsx` (minor)
- No structural changes needed — the Index page will transform DB data to match the existing `Squad` interface

## Files changed
- `src/hooks/useDashboardData.ts` — new file
- `src/pages/Index.tsx` — replace mock imports with real data hook

