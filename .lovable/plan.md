

# Fix: Chart timeline must end at sprint end date

## Problem
1. There is a stale record in `sprint_progress_daily` dated `2026-04-12` for this sprint (which ends `2026-04-10`). This was created before the date-clamping fix in `azure-sync`.
2. The frontend code (`useSprintDetailData.ts`) extends the timeline to `max(end_date, lastActualDate)`, so it renders days beyond the sprint.

## Solution

### 1. Delete stale data (SQL migration)
Remove the `sprint_progress_daily` record where `date > sprint.end_date`:
```sql
DELETE FROM sprint_progress_daily
WHERE sprint_id = '59d860f0-412a-4f42-a9a5-60a0741ff927'
  AND date > '2026-04-10';
```
Also run a general cleanup for all sprints to prevent this elsewhere.

### 2. Cap timeline to sprint end date (`src/hooks/useSprintDetailData.ts`)
Remove the logic that extends the timeline beyond `end_date`. Change:
- `timelineEnd = lastActualDate > end ? lastActualDate : end` → `timelineEnd = end`
- Remove `lastActualDate` tracking
- Filter out any `progressDaily` entries where `date > sprint.end_date` before building the chart

This ensures charts always end on the last day of the sprint, regardless of any stale data in the database.

### 3. Already fixed in azure-sync
The sync function already clamps snapshot dates to `min(today, end_date)`, so no new stale records will be created.

### Expected result
Burndown and Burnup charts for E-commerce will end at 10/04, showing 12 data points (03/30 through 04/10).

