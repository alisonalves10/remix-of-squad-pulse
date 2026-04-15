
CREATE TABLE public.roadmap_item_squads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_item_id uuid NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  cost_share numeric NOT NULL DEFAULT 0,
  UNIQUE (roadmap_item_id, squad_id)
);

ALTER TABLE public.roadmap_item_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roadmap_item_squads"
  ON public.roadmap_item_squads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert roadmap_item_squads"
  ON public.roadmap_item_squads FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roadmap_item_squads"
  ON public.roadmap_item_squads FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roadmap_item_squads"
  ON public.roadmap_item_squads FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
