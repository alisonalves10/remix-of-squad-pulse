-- Users table for profiles
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  azure_devops_unique_name TEXT,
  role TEXT DEFAULT 'developer',
  squad_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Squads table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  azure_team_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for users.squad_id
ALTER TABLE public.users ADD CONSTRAINT fk_users_squad FOREIGN KEY (squad_id) REFERENCES public.squads(id) ON DELETE SET NULL;

-- Sprints table
CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  azure_iteration_path TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work items table
CREATE TABLE public.work_items (
  id INTEGER NOT NULL PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  story_points NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_spillover BOOLEAN DEFAULT false
);

-- Metrics snapshot table
CREATE TABLE public.metrics_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  planned_points NUMERIC DEFAULT 0,
  completed_points NUMERIC DEFAULT 0,
  bugs_created INTEGER DEFAULT 0,
  bugs_resolved INTEGER DEFAULT 0,
  items_planned INTEGER DEFAULT 0,
  items_completed INTEGER DEFAULT 0
);

-- Sprint progress daily for burndown/burnup
CREATE TABLE public.sprint_progress_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  remaining_points NUMERIC DEFAULT 0,
  completed_points NUMERIC DEFAULT 0,
  total_scope_points NUMERIC DEFAULT 0,
  UNIQUE(sprint_id, date)
);

-- Azure DevOps configuration table
CREATE TABLE public.azure_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization TEXT NOT NULL,
  project TEXT NOT NULL,
  pat_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_progress_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_config ENABLE ROW LEVEL SECURITY;

-- For now, allow public read access (will be updated with auth later)
CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read access on squads" ON public.squads FOR SELECT USING (true);
CREATE POLICY "Allow public read access on sprints" ON public.sprints FOR SELECT USING (true);
CREATE POLICY "Allow public read access on work_items" ON public.work_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access on metrics_snapshot" ON public.metrics_snapshot FOR SELECT USING (true);
CREATE POLICY "Allow public read access on sprint_progress_daily" ON public.sprint_progress_daily FOR SELECT USING (true);
CREATE POLICY "Allow public read access on azure_config" ON public.azure_config FOR SELECT USING (true);

-- Allow insert/update for all tables (will be restricted with auth later)
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on squads" ON public.squads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on sprints" ON public.sprints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on work_items" ON public.work_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on metrics_snapshot" ON public.metrics_snapshot FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on sprint_progress_daily" ON public.sprint_progress_daily FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on azure_config" ON public.azure_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public update on squads" ON public.squads FOR UPDATE USING (true);
CREATE POLICY "Allow public update on sprints" ON public.sprints FOR UPDATE USING (true);
CREATE POLICY "Allow public update on work_items" ON public.work_items FOR UPDATE USING (true);
CREATE POLICY "Allow public update on metrics_snapshot" ON public.metrics_snapshot FOR UPDATE USING (true);
CREATE POLICY "Allow public update on sprint_progress_daily" ON public.sprint_progress_daily FOR UPDATE USING (true);
CREATE POLICY "Allow public update on azure_config" ON public.azure_config FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_sprints_squad_id ON public.sprints(squad_id);
CREATE INDEX idx_work_items_sprint_id ON public.work_items(sprint_id);
CREATE INDEX idx_work_items_squad_id ON public.work_items(squad_id);
CREATE INDEX idx_work_items_assigned_to ON public.work_items(assigned_to_user_id);
CREATE INDEX idx_metrics_sprint_id ON public.metrics_snapshot(sprint_id);
CREATE INDEX idx_progress_sprint_id ON public.sprint_progress_daily(sprint_id);