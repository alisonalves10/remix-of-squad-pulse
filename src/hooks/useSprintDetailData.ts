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

      const totalEstimate = chartItems.reduce((sum, wi) => sum + Number(wi.original_estimate ?? 0), 0);
      const totalCompleted = chartItems.reduce((sum, wi) => sum + Number(wi.completed_work ?? 0), 0);
      const totalRemaining = chartItems.reduce((sum, wi) => sum + Number(wi.remaining_work ?? 0), 0);

      let burndownData: Array<{ date: string; remaining: number; ideal: number }> = [];
      let burnupData: Array<{ date: string; completed: number; scope: number }> = [];

      if (progressDaily.length > 0) {
        const sprintDays = progressDaily.length;
        burndownData = progressDaily.map((d, i) => ({
          date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          remaining: Number(d.remaining_points ?? 0),
          ideal: Math.max(0, totalEstimate - (totalEstimate / (sprintDays - 1)) * i),
        }));
        burnupData = progressDaily.map((d) => ({
          date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          completed: Number(d.completed_points ?? 0),
          scope: Number(d.total_scope_points ?? 0),
        }));
      } else if (totalEstimate > 0) {
        // Fallback: generate synthetic burndown/burnup from sprint dates and current totals
        const start = new Date(sprint.start_date);
        const end = new Date(sprint.end_date);
        const today = new Date();
        const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
        const elapsed = Math.min(totalDays, Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000)));

        for (let i = 0; i <= totalDays; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const ideal = Math.max(0, totalEstimate - (totalEstimate / totalDays) * i);

          if (i <= elapsed) {
            // Interpolate remaining from totalEstimate to current remaining
            const progress = elapsed > 0 ? i / elapsed : 1;
            const remaining = totalEstimate - (totalEstimate - totalRemaining) * progress;
            const completed = totalCompleted * progress;
            burndownData.push({ date: label, remaining: Math.round(remaining * 100) / 100, ideal: Math.round(ideal * 100) / 100 });
            burnupData.push({ date: label, completed: Math.round(completed * 100) / 100, scope: totalEstimate });
          } else {
            burndownData.push({ date: label, remaining: 0, ideal: Math.round(ideal * 100) / 100 });
            burnupData.push({ date: label, completed: 0, scope: totalEstimate });
          }
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
