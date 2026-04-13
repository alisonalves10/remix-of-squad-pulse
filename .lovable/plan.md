

# Fix: Default sprint selection to Backoffice + current sprint

## Problem
When navigating to `/sprints` (no sprint ID in URL), the hook picks `sprints[0]` — the first sprint sorted by `start_date DESC` across ALL squads. This lands on "Sprint 10 Sellers e Produtos" instead of Backoffice's current sprint.

## Solution

### `src/hooks/useSprintDetailData.ts`
When no `sprintId` is provided, change the default selection logic:
1. Find the Backoffice squad (case-insensitive match)
2. Filter sprints for that squad
3. Find the current sprint (today between start_date and end_date, not closed), or fall back to the most recent one

```typescript
const sprint = sprintId
  ? sprints.find((s) => s.id === sprintId) || sprints[0]
  : (() => {
      const backoffice = squadsData.find(s => s.name.toLowerCase() === "backoffice");
      const squadId = backoffice?.id || squadsData[0]?.id;
      const squadSprints = sprints.filter(s => s.squad_id === squadId);
      const today = new Date().toISOString().split("T")[0];
      const current = squadSprints.find(s => !s.is_closed && s.start_date <= today && s.end_date >= today);
      return current || squadSprints[0] || sprints[0];
    })();
```

### `src/pages/Sprints.tsx`
The `useEffect` on lines 38-49 already defaults `selectedSquadId` to Backoffice when no URL id — but the hook already loaded the wrong sprint. With the hook fix above, both will be consistent.

## Files changed
- `src/hooks/useSprintDetailData.ts` — default to Backoffice's current sprint

