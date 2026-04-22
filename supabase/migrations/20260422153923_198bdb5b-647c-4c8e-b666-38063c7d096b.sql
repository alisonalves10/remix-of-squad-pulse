-- Create junction table for roadmap items to business units with cost share
CREATE TABLE public.roadmap_item_business_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  cost_share NUMERIC NOT NULL DEFAULT 0,
  CONSTRAINT roadmap_item_business_units_unique UNIQUE (roadmap_item_id, business_unit_id)
);

-- Enable RLS
ALTER TABLE public.roadmap_item_business_units ENABLE ROW LEVEL SECURITY;

-- Policies (same pattern as roadmap_item_squads)
CREATE POLICY "Authenticated users can view roadmap_item_business_units"
ON public.roadmap_item_business_units
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert roadmap_item_business_units"
ON public.roadmap_item_business_units
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roadmap_item_business_units"
ON public.roadmap_item_business_units
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roadmap_item_business_units"
ON public.roadmap_item_business_units
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Helpful indexes
CREATE INDEX idx_roadmap_item_business_units_item ON public.roadmap_item_business_units(roadmap_item_id);
CREATE INDEX idx_roadmap_item_business_units_bu ON public.roadmap_item_business_units(business_unit_id);