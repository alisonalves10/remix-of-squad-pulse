
-- Business Units table
CREATE TABLE public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view business_units" ON public.business_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert business_units" ON public.business_units FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update business_units" ON public.business_units FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete business_units" ON public.business_units FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Squad ↔ Business Unit association
CREATE TABLE public.squad_business_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  UNIQUE(squad_id, business_unit_id)
);
ALTER TABLE public.squad_business_unit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view squad_business_unit" ON public.squad_business_unit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert squad_business_unit" ON public.squad_business_unit FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update squad_business_unit" ON public.squad_business_unit FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete squad_business_unit" ON public.squad_business_unit FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Roadmap Items table
CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  priority text NOT NULL DEFAULT 'medium',
  start_date date,
  end_date date,
  invested_hours numeric DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  category text NOT NULL DEFAULT 'feature',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roadmap_items" ON public.roadmap_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roadmap_items" ON public.roadmap_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roadmap_items" ON public.roadmap_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roadmap_items" ON public.roadmap_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
