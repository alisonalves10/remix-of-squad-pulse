

# Plan: Support multiple Area Paths (teams) sync

## What changes

Allow the user to configure and sync multiple Area Paths (e.g., "Backoffice", "Payments", "Platform") in a single sync operation, creating one squad per area path.

## Implementation

### 1. Update Settings UI (`src/pages/Settings.tsx`)
- Replace the single `areaPath` text input with a multi-value input (comma-separated tags or a list with add/remove buttons)
- Default value: `"Backoffice"` → display as a tag list
- The sync button sends `{ areaPaths: ["Backoffice", "Payments", ...] }` instead of `{ areaPath: "Backoffice" }`
- Show per-area-path sync progress/results in the toast

### 2. Update Edge Function (`supabase/functions/azure-sync/index.ts`)
- Accept `areaPaths` (string array) in addition to the existing `areaPath` (string) for backward compatibility
- Loop over each area path and run the existing sync logic (fetch current iteration, WIQL query, fetch work items, sync to database) per area path
- Collect results per area path and return a summary: `{ results: [{ areaPath, synced, sprint, error? }, ...] }`
- Each area path creates/updates its own squad, sprint, metrics, and work items independently

### 3. UI for managing area paths
- Simple tag-style input: text field + "Add" button, with removable badges showing each configured area path
- Store the list in component state; send all on sync

## Files changed
- `src/pages/Settings.tsx` — multi area path UI
- `supabase/functions/azure-sync/index.ts` — loop over multiple area paths

