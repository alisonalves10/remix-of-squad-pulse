

# Fix Burndown and Burnup Charts

## Problem
The charts only show a dashed line (the ideal line as a single point) because `sprint_progress_daily` has only 1 record for this sprint. The code maps directly over `progressDaily` rows, so with 1 row you get 1 data point — not enough to draw a line.

## Solution
Update `useSprintDetailData.ts` to always generate the full sprint date range (from `start_date` to `end_date`) when building chart data, and merge actual `sprint_progress_daily` records into the appropriate dates.

### Changes to `src/hooks/useSprintDetailData.ts`

Replace the chart data generation logic (lines 67-105) with:

1. **Always use full sprint date range** — iterate from `sprint.start_date` to `sprint.end_date`, creating one entry per day
2. **Build a lookup map** from `progressDaily` keyed by date string
3. **For each day in the range:**
   - Calculate the **ideal** burndown line (linear from `totalEstimate` to 0)
   - If actual data exists for that date, use `remaining_points` and `completed_points`
   - If no actual data and the date is in the past, interpolate or leave null so the line stops at the last known point
   - If the date is in the future, don't plot actual values
4. **Handle edge case** where `sprintDays - 1 === 0` (single day sprint) to avoid division by zero

This ensures:
- The ideal dashed line always spans the full sprint
- The actual line connects all available data points
- Charts render properly even with partial data (1+ days of actual data)

No database changes needed — this is purely a frontend data transformation fix.

