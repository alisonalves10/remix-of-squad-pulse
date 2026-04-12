

# Plan: Filter burndown/burnup charts by work item type

## Problem
The burndown and burnup charts currently use **all** work items. They should only consider items of type **Task**, **Issue**, **Bug**, and **Speed** — excluding User Stories, Features, Epics, etc.

## Changes

### 1. `src/hooks/useSprintDetailData.ts`
- After fetching `workItems`, create a filtered subset containing only items where `type` is one of `["Task", "Issue", "Bug", "Speed"]`
- Use this filtered subset to calculate:
  - `totalEstimate` (sum of `original_estimate`)
  - `totalCompleted` (sum of `completed_work`)
  - `totalRemaining` (sum of `remaining_work`)
- These filtered totals feed the burndown and burnup chart data generation (both the `sprint_progress_daily` path and the synthetic fallback path)
- The KPIs and work items table continue using the full `workItems` array (all types)

### Files changed
- `src/hooks/useSprintDetailData.ts` — add type filter for chart calculations

