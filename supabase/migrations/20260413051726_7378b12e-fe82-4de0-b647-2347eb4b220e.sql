
-- Step 1: Drop foreign keys referencing work_items(id) if any exist
-- (there are none based on schema)

-- Step 2: Add new UUID pk column
ALTER TABLE public.work_items ADD COLUMN pk uuid DEFAULT gen_random_uuid();

-- Step 3: Populate pk for existing rows
UPDATE public.work_items SET pk = gen_random_uuid() WHERE pk IS NULL;

-- Step 4: Make pk NOT NULL
ALTER TABLE public.work_items ALTER COLUMN pk SET NOT NULL;

-- Step 5: Drop the old primary key
ALTER TABLE public.work_items DROP CONSTRAINT work_items_pkey;

-- Step 6: Add new primary key on pk
ALTER TABLE public.work_items ADD PRIMARY KEY (pk);

-- Step 7: Add unique constraint on (id, sprint_id)
ALTER TABLE public.work_items ADD CONSTRAINT work_items_id_sprint_id_unique UNIQUE (id, sprint_id);
