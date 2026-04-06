
ALTER TABLE public.work_items
  ADD COLUMN original_estimate numeric DEFAULT 0,
  ADD COLUMN remaining_work numeric DEFAULT 0,
  ADD COLUMN completed_work numeric DEFAULT 0;

ALTER TABLE public.metrics_snapshot
  ADD COLUMN planned_hours numeric DEFAULT 0,
  ADD COLUMN completed_hours numeric DEFAULT 0;
