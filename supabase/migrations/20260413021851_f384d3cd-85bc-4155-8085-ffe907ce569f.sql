DELETE FROM sprint_progress_daily
WHERE id IN (
  SELECT d.id
  FROM sprint_progress_daily d
  JOIN sprints s ON s.id = d.sprint_id
  WHERE d.date > s.end_date
);