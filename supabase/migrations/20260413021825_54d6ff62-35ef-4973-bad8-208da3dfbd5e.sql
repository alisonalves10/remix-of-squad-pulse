DELETE FROM sprint_progress_daily d
USING sprints s
WHERE d.sprint_id = s.id
  AND d.date > s.end_date;