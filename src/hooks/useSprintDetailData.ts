import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Parse YYYY-MM-DD as local date (no timezone shift) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date to YYYY-MM-DD without timezone issues */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useSprintDetailData(sprintId?: string) {
  return useQuery({
    queryKey: ["sprint-detail", sprintId ?? "default"],
    queryFn: async () => {
      // Fetch all sprints with squad name
      const { data: sprints, error: sprintsErr } = await supabase
        .from("sprints")
        .select("*, squads(name)")
        .order("start_date", { ascending: false });

      if (sprintsErr) throw sprintsErr;
      if (!sprints || sprints.length === 0) return null;

      const sprint = sprintId
        ? sprints.find((s) => s.id === sprintId) || sprints[0]
        : sprints[0];

      // Fetch work items and metrics for the selected sprint
      const [workItemsRes, metricsRes, progressRes, usersRes] = await Promise.all([
        supabase
          .from("work_items")
          .select("id, type, title, state, story_points, original_estimate, remaining_work, completed_work, is_spillover, assigned_to_user_id, created_at, completed_at")
          .eq("sprint_id", sprint.id)
          .order("id"),
        supabase
          .from("metrics_snapshot")
          .select("*")
          .eq("sprint_id", sprint.id)
          .eq("squad_id", sprint.squad_id)
          .single(),
        supabase
          .from("sprint_progress_daily")
          .select("date, remaining_points, completed_points, total_scope_points")
          .eq("sprint_id", sprint.id)
          .order("date", { ascending: true }),
        supabase
          .from("users")
          .select("id, name"),
      ]);

      if (workItemsRes.error) throw workItemsRes.error;

      const usersMap = new Map<string, string>();
      (usersRes.data || []).forEach((u) => usersMap.set(u.id, u.name));

      const workItems = (workItemsRes.data || []).map((wi) => ({
        ...wi,
        assigned_to_name: wi.assigned_to_user_id ? usersMap.get(wi.assigned_to_user_id) || "—" : "—",
      }));
      const metrics = metricsRes.data;
      const progressDaily = progressRes.data || [];

      // Filter work items for chart calculations (only Task, Issue, Bug, Speed)
      const chartTypes = ["Task", "Issue", "Bug", "Speed"];
      const chartItems = workItems.filter((wi) => chartTypes.includes(wi.type));

      // Use the first day's scope from sprint_progress_daily if available, otherwise fall back to work items
      const firstDayScope = progressDaily.length > 0 ? Number(progressDaily[0].total_scope_points ?? 0) : 0;
      const totalEstimate = firstDayScope > 0
        ? firstDayScope
        : chartItems.reduce((sum, wi) => sum + Number(wi.original_estimate ?? 0), 0);
      const totalCompleted = chartItems.reduce((sum, wi) => sum + Number(wi.completed_work ?? 0), 0);
      const totalRemaining = chartItems.reduce((sum, wi) => sum + Number(wi.remaining_work ?? 0), 0);

      let burndownData: Array<{ date: string; remaining: number | null; ideal: number }> = [];
      let burnupData: Array<{ date: string; completed: number | null; scope: number | null }> = [];

      const start = parseLocalDate(sprint.start_date);
      const end = parseLocalDate(sprint.end_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Filter out any stale records beyond sprint end date
      const filteredDaily = progressDaily.filter((d) => d.date <= sprint.end_date);

      // Build lookup from actual daily data
      const dailyMap = new Map<string, { remaining: number; completed: number; scope: number }>();
      filteredDaily.forEach((d) => {
        dailyMap.set(d.date, {
          remaining: Number(d.remaining_points ?? 0),
          completed: Number(d.completed_points ?? 0),
          scope: Number(d.total_scope_points ?? 0),
        });
      });

      // Timeline always ends at sprint end date
      const sprintDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
      const totalTimelineDays = sprintDays;

      let hasSeenActual = false;

      for (let i = 0; i <= totalTimelineDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dateKey = d.toISOString().split("T")[0];

        // Ideal line only spans the official sprint range
        const ideal = i <= sprintDays
          ? Math.max(0, Math.round((totalEstimate - (totalEstimate / sprintDays) * i) * 100) / 100)
          : 0;

        const actual = dailyMap.get(dateKey);

        if (actual) {
          hasSeenActual = true;
          burndownData.push({ date: label, remaining: actual.remaining, ideal });
          burnupData.push({ date: label, completed: actual.completed, scope: actual.scope });
        } else if (d <= today && hasSeenActual) {
          // Past date after first snapshot — carry last known values
          const lastRemaining = burndownData.filter(b => b.remaining !== null).slice(-1)[0]?.remaining ?? null;
          const lastBurnup = burnupData.filter(b => b.completed !== null).slice(-1)[0];
          burndownData.push({ date: label, remaining: lastRemaining, ideal });
          burnupData.push({ date: label, completed: lastBurnup?.completed ?? null, scope: lastBurnup?.scope ?? null });
        } else if (d > today) {
          // Future date — only ideal line
          burndownData.push({ date: label, remaining: null, ideal });
          burnupData.push({ date: label, completed: null, scope: null });
        } else {
          // Past date before first snapshot — no actual data
          burndownData.push({ date: label, remaining: null, ideal });
          burnupData.push({ date: label, completed: null, scope: null });
        }
      }

      const totalItems = workItems.length;
      const completedItems = workItems.filter((wi) =>
        ["Done", "Closed"].includes(wi.state)
      ).length;
      const spilloverItems = workItems.filter((wi) => wi.is_spillover).length;
      const bugsCreated = workItems.filter((wi) => wi.type === "Bug").length;
      const bugsResolved = workItems.filter(
        (wi) => wi.type === "Bug" && ["Done", "Closed"].includes(wi.state)
      ).length;

      const plannedHours = Number(metrics?.planned_hours ?? 0);
      const completedHours = Number(metrics?.completed_hours ?? 0);
      const commitment = plannedHours > 0 ? Math.round((completedHours / plannedHours) * 100) : 0;

      // Get unique types and states for filters
      const types = [...new Set(workItems.map((wi) => wi.type))].sort();
      const states = [...new Set(workItems.map((wi) => wi.state))].sort();

      return {
        sprint: {
          ...sprint,
          squadName: (sprint as any).squads?.name || "—",
        },
        allSprints: sprints.map((s) => ({
          id: s.id,
          name: s.name,
          squadName: (s as any).squads?.name || "—",
        })),
        workItems,
        totalItems,
        completedItems,
        spilloverItems,
        bugsCreated,
        bugsResolved,
        plannedHours,
        completedHours,
        commitment,
        types,
        states,
        burndownData,
        burnupData,
      };
    },
  });
}
