-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================
-- Fix users table
-- =====================
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
DROP POLICY IF EXISTS "Allow public update on users" ON public.users;

CREATE POLICY "Authenticated users can view users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (true);

-- =====================
-- Fix azure_config table (admin only)
-- =====================
DROP POLICY IF EXISTS "Allow public insert on azure_config" ON public.azure_config;
DROP POLICY IF EXISTS "Allow public read access on azure_config" ON public.azure_config;
DROP POLICY IF EXISTS "Allow public update on azure_config" ON public.azure_config;

CREATE POLICY "Admins can view azure_config"
ON public.azure_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert azure_config"
ON public.azure_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update azure_config"
ON public.azure_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete azure_config"
ON public.azure_config
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- Fix squads table
-- =====================
DROP POLICY IF EXISTS "Allow public insert on squads" ON public.squads;
DROP POLICY IF EXISTS "Allow public read access on squads" ON public.squads;
DROP POLICY IF EXISTS "Allow public update on squads" ON public.squads;

CREATE POLICY "Authenticated users can view squads"
ON public.squads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert squads"
ON public.squads
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update squads"
ON public.squads
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete squads"
ON public.squads
FOR DELETE
TO authenticated
USING (true);

-- =====================
-- Fix remaining tables with public policies
-- =====================

-- metrics_snapshot
DROP POLICY IF EXISTS "Allow public insert on metrics_snapshot" ON public.metrics_snapshot;
DROP POLICY IF EXISTS "Allow public read access on metrics_snapshot" ON public.metrics_snapshot;
DROP POLICY IF EXISTS "Allow public update on metrics_snapshot" ON public.metrics_snapshot;

CREATE POLICY "Authenticated users can view metrics_snapshot"
ON public.metrics_snapshot
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert metrics_snapshot"
ON public.metrics_snapshot
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update metrics_snapshot"
ON public.metrics_snapshot
FOR UPDATE
TO authenticated
USING (true);

-- sprint_progress_daily
DROP POLICY IF EXISTS "Allow public insert on sprint_progress_daily" ON public.sprint_progress_daily;
DROP POLICY IF EXISTS "Allow public read access on sprint_progress_daily" ON public.sprint_progress_daily;
DROP POLICY IF EXISTS "Allow public update on sprint_progress_daily" ON public.sprint_progress_daily;

CREATE POLICY "Authenticated users can view sprint_progress_daily"
ON public.sprint_progress_daily
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sprint_progress_daily"
ON public.sprint_progress_daily
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sprint_progress_daily"
ON public.sprint_progress_daily
FOR UPDATE
TO authenticated
USING (true);

-- sprints
DROP POLICY IF EXISTS "Allow public insert on sprints" ON public.sprints;
DROP POLICY IF EXISTS "Allow public read access on sprints" ON public.sprints;
DROP POLICY IF EXISTS "Allow public update on sprints" ON public.sprints;

CREATE POLICY "Authenticated users can view sprints"
ON public.sprints
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sprints"
ON public.sprints
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sprints"
ON public.sprints
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sprints"
ON public.sprints
FOR DELETE
TO authenticated
USING (true);