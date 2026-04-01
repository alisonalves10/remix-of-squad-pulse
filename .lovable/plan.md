

# Plan: Connect Settings to Database + Create Azure DevOps Sync Edge Function

## Current Problem

The Settings page is **entirely mock** — form values are stored in React state only and never persisted. There is no edge function to call the Azure DevOps API. The `azure_config` table in the database is empty.

To list sprint data from Azure DevOps (areaPath=Backoffice), we need to build the full pipeline.

## Implementation Steps

### 1. Add authentication (login/signup pages)
All tables require authentication via RLS. Without auth, no data can be read or written. We need:
- A login page (`/login`) and signup page (`/signup`)
- Auth context/provider wrapping the app
- Protected routes redirecting unauthenticated users to login
- After first user signs up, assign them the `admin` role (needed for `azure_config` access)

### 2. Wire Settings page to the database
Replace mock state with real Supabase calls:
- **Save Config**: insert/upsert `azure_config` with organization, project, and PAT (encrypted)
- **Load Config**: fetch existing `azure_config` on page mount
- Store the PAT as a Supabase secret (via `add_secret` tool) rather than plain text in the DB

### 3. Create `azure-sync` edge function
A backend function that:
1. Reads `azure_config` from the database (org, project, PAT)
2. Calls Azure DevOps REST API:
   - **WIQL query** to get work items filtered by `[System.AreaPath] UNDER 'Backoffice'` for the current iteration
   - **Work Items batch endpoint** with `$expand=relations` for details and hierarchy
   - **Iterations endpoint** for sprint dates and state
3. Upserts data into: `squads`, `sprints`, `work_items`
4. Calculates and upserts `metrics_snapshot` and `sprint_progress_daily`
5. Returns a summary of synced items

### 4. Connect "Sincronizar Agora" button to the edge function
- Call `supabase.functions.invoke('azure-sync')` with the authenticated user's token
- Show progress/results via toast notifications

### 5. Update squad/sprint pages to use real data
- Replace `mockSprints`, `mockWorkItems`, etc. with queries to Supabase tables
- Filter by `squad_id` and current sprint dates

## Technical Details

- **Azure DevOps API base**: `https://dev.azure.com/{org}/{project}/_apis`
- **WIQL endpoint**: `POST _apis/wit/wiql?api-version=7.0` with query filtering `[System.AreaPath] UNDER 'Backoffice'` and `[System.IterationPath] = @CurrentIteration`
- **Auth**: Basic auth with PAT (base64 of `:PAT`)
- **Edge function** uses service role key to bypass RLS for writing synced data
- **work_items.id** uses Azure work item ID (integer) as primary key — natural dedup on re-sync

## Prerequisites
- User must provide their Azure DevOps PAT (will be requested via the `add_secret` tool for secure storage)
- User must have a valid Azure DevOps organization, project, and area path configured

