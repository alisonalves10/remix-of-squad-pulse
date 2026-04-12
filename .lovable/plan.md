

# Plan: Update area paths and re-sync

## Steps

1. **Update `azure_config`** — Use the insert tool to run an `UPDATE` setting `area_paths` to `ARRAY['Backoffice','E-commerce','Logistica','Vendas','Sellers e Produtos']` on the existing config row.

2. **Trigger sync** — Call the `azure-sync` Edge Function via `curl_edge_functions` to re-run synchronization for all five squads.

3. **Verify** — Query `sprint_progress_daily` joined with `sprints`/`squads` to confirm daily records were created for each squad.

## Technical details
- Single `UPDATE` on `azure_config` table
- Edge function already reads `area_paths` from config when body doesn't provide them
- No schema or code changes needed

