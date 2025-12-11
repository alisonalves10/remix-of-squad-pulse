-- Drop existing overly permissive policies on work_items
DROP POLICY IF EXISTS "Allow public insert on work_items" ON public.work_items;
DROP POLICY IF EXISTS "Allow public read access on work_items" ON public.work_items;
DROP POLICY IF EXISTS "Allow public update on work_items" ON public.work_items;

-- Create secure RLS policies that require authentication
CREATE POLICY "Authenticated users can view work_items"
ON public.work_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert work_items"
ON public.work_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update work_items"
ON public.work_items
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete work_items"
ON public.work_items
FOR DELETE
TO authenticated
USING (true);