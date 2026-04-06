

# Plan: Switch metrics from Story Points to Time (hours)

## Problem
The dashboard currently uses `story_points` (from `Microsoft.VSTS.Scheduling.StoryPoints`) for velocity and metrics. The actual Azure DevOps data uses time-based fields: **Original Estimate**, **Remaining Work**, and **Completed Work** — all in hours.

## Changes

### 1. Database migration — add time columns to `work_items`
Add three new columns to `work_items`:
- `original_estimate` (numeric, default 0) — planned hours
- `remaining_work` (numeric, default 0) — hours left
- `completed_work` (numeric, default 0) — hours done

### 2. Database migration — add time columns to `metrics_snapshot`
Add two columns:
- `planned_hours` (numeric, default 0) — sum of Original Estimate
- `completed_hours` (numeric, default 0) — sum of Completed Work

### 3. Update Edge Function (`supabase/functions/azure-sync/index.ts`)
- Extract Azure fields `Microsoft.VSTS.Scheduling.OriginalEstimate`, `Microsoft.VSTS.Scheduling.RemainingWork`, `Microsoft.VSTS.Scheduling.CompletedWork` when syncing work items
- Store them in the new `work_items` columns
- Calculate `planned_hours` (sum of Original Estimate) and `completed_hours` (sum of Completed Work) for `metrics_snapshot`

### 4. Update `src/hooks/useDashboardData.ts`
- Fetch the new time columns from `work_items` (`original_estimate, remaining_work, completed_work`)
- Replace all velocity/commitment calculations to use `planned_hours` and `completed_hours` from `metrics_snapshot` instead of `planned_points` / `completed_points`
- Velocity = total completed hours; Commitment = completed_hours / planned_hours

### 5. Update `src/pages/Index.tsx`
- Change labels from "pts" to "h" (hours)
- Update chart descriptions from "Story points" to "Horas"

## Files changed
- `supabase/migrations/` — new migration for schema changes
- `supabase/functions/azure-sync/index.ts` — extract time fields, compute hour-based metrics
- `src/hooks/useDashboardData.ts` — use hours instead of points
- `src/pages/Index.tsx` — update labels

