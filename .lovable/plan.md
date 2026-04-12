

# Fix Burndown/Burnup Charts — Backfill Historical Daily Data

## Problem
The charts only have **1 data point** (clamped to 04/10) because the sync only captures a snapshot for "today". Since this sprint (3/30–4/10) already ended before the first sync ran, we get a flat line then a sudden drop — instead of the gradual daily decrease shown in Azure DevOps.

## Root Cause
The `azure-sync` function only records the current state as a single daily snapshot. It never backfills historical data. Azure DevOps has this history — we need to fetch it.

## Solution
Add a **backfill step** to the `azure-sync` Edge Function that fetches daily historical remaining/completed work from the **Azure DevOps Analytics OData API**, then populates `sprint_progress_daily` with one row per day for the entire sprint.

### Changes

**1. `supabase/functions/azure-sync/index.ts`** — Add backfill function

After syncing work items and recording today's snapshot, call the Azure Analytics OData endpoint to get daily aggregated data for the sprint:

```
GET https://analytics.dev.azure.com/{org}/{project}/_odata/v3.0-preview/WorkItemSnapshot
  ?$apply=filter(
    Iteration/IterationPath eq '{iterPath}'
    and DateValue ge {startDate} and DateValue le {endDate}
    and WorkItemType in ('Task','Bug','Issue')
  )/groupby(
    (DateValue),
    aggregate(
      RemainingWork with sum as TotalRemaining,
      CompletedWork with sum as TotalCompleted,
      OriginalEstimate with sum as TotalEstimate
    )
  )
```

For each day returned, upsert into `sprint_progress_daily` (skip dates that already have data from real-time syncs, or overwrite with more accurate historical values).

This runs once per sync — for active sprints it fills past days; for ended sprints it backfills the entire range.

**2. `src/hooks/useSprintDetailData.ts`** — Minor cleanup

With proper daily data, the existing chart logic will work correctly. One small fix: ensure the ideal line uses `totalEstimate` from the **first day's scope** (from `sprint_progress_daily`) rather than from current work items, since scope may have changed mid-sprint.

### No schema changes needed
The existing `sprint_progress_daily` table already has all required columns.

### Expected result
Charts will match Azure DevOps: gradual daily burndown with the ideal trend line, and burnup showing progressive completion against scope.

