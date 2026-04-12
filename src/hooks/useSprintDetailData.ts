import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const [workItemsRes, metricsRes, progressRes] = await Promise.all([
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
      ]);

      if (workItemsRes.error) throw workItemsRes.error;

      const workItems = workItemsRes.data || [];
      const metrics = metricsRes.data;
      const progressDaily = progressRes.data || [];

      // Build burndown data
      const totalEstimate = Number(metrics?.planned_hours ?? 0);
      const sprintDays = progressDaily.length || 1;
      const burndownData = progressDaily.map((d, i) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        remaining: Number(d.remaining_points ?? 0),
        ideal: Math.max(0, totalEstimate - (totalEstimate / (sprintDays - 1)) * i),
      }));

      // Build burnup data
      const burnupData = progressDaily.map((d) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        completed: Number(d.completed_points ?? 0),
        scope: Number(d.total_scope_points ?? 0),
      }));

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
      };
    },
  });
}
