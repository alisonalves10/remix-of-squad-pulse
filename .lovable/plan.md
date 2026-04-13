

# Add "B2B e Instalação" Area Path and Sync

## Steps

1. **Update azure_config** — Add `"B2B e Instalação"` to the `area_paths` array in the existing config record (ID: `707ddbb3-...`). This will be done via a database migration since we need an UPDATE.

2. **Trigger sync** — Call the `azure-sync` edge function with `areaPaths: ["B2B e Instalação"]` to import work items, sprints, and historical daily progress for this new squad.

3. **Verify** — Query the database to confirm the new squad was created and data was imported correctly.

## Technical detail
- Migration SQL: `UPDATE azure_config SET area_paths = array_append(area_paths, 'B2B e Instalação') WHERE id = '707ddbb3-3556-411f-a260-53fb9b7e3baa';`
- The edge function will automatically create the squad, find active sprints, sync work items, and backfill historical burndown data.

