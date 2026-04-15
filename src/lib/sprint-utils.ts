/** Check if a sprint is currently active based on date range */
export function isSprintActive(sprint: { start_date: string; end_date: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return sprint.start_date <= today && sprint.end_date >= today;
}

/** Find the current sprint (date-based) from a list */
export function getCurrentSprint<T extends { start_date: string; end_date: string }>(sprints: T[]): T | undefined {
  return sprints.find(s => isSprintActive(s));
}

/** Check if a sprint is finished (end_date in the past) */
export function isSprintFinished(sprint: { start_date: string; end_date: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return sprint.end_date < today;
}

/** Check if a sprint is in the future (start_date > today) */
export function isSprintFuture(sprint: { start_date: string; end_date: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return sprint.start_date > today;
}
