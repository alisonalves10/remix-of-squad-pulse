

# Plan: Fix `@CurrentIteration` to fetch only Sprint 7

## Problem
The `@CurrentIteration` WIQL macro requires a **team context** to resolve correctly. Without it, Azure DevOps doesn't know which team's iteration schedule to use, so it returns work items from multiple iterations. That's why 8 different sprints were synced instead of just "2026 - Sprint 7".

## Solution
Two changes in `supabase/functions/azure-sync/index.ts`:

### 1. Pass team context to the WIQL API call
The Azure DevOps WIQL endpoint accepts a `team` parameter:
```
POST https://dev.azure.com/{org}/{project}/{team}/_apis/wit/wiql?api-version=7.0
```
We'll use the `areaPath` value (e.g. "Backoffice") as the team name in the URL. This tells Azure which team's iteration schedule to use when resolving `@CurrentIteration`.

### 2. Fetch actual iteration dates from Azure API
After the WIQL query, call the Azure Iterations API to get the real start/end dates for the current iteration:
```
GET https://dev.azure.com/{org}/{project}/{team}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.0
```
Use these dates when upserting the sprint record instead of hardcoding `today + 14 days`.

### 3. Clean up stale data
Before syncing, delete work items and sprints that were incorrectly synced from non-current iterations (the 7 extra sprints). This will be done as a one-time cleanup in the edge function or via a migration.

## Files changed
- `supabase/functions/azure-sync/index.ts` — add team to WIQL URL, fetch iteration dates, cleanup logic

