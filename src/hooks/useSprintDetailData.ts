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

      // Always generate full sprint date range
      const start = new Date(sprint.start_date);
      const end = new Date(sprint.end_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Build lookup from actual daily data
      const dailyMap = new Map<string, { remaining: number; completed: number; scope: number }>();
      progressDaily.forEach((d) => {
        dailyMap.set(d.date, {
          remaining: Number(d.remaining_points ?? 0),
          completed: Number(d.completed_points ?? 0),
          scope: Number(d.total_scope_points ?? 0),
        });
      });

      const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

      for (let i = 0; i <= totalDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dateKey = d.toISOString().split("T")[0];
        const ideal = totalDays > 0
          ? Math.max(0, Math.round((totalEstimate - (totalEstimate / totalDays) * i) * 100) / 100)
          : 0;

        const actual = dailyMap.get(dateKey);

        if (actual) {
          burndownData.push({ date: label, remaining: actual.remaining, ideal });
          burnupData.push({ date: label, completed: actual.completed, scope: actual.scope });
        } else if (d <= today) {
          // Past date with no data — use last known values or interpolate
          const lastBurndown = burndownData.length > 0 ? burndownData[burndownData.length - 1].remaining : totalEstimate;
          const lastBurnup = burnupData.length > 0 ? burnupData[burnupData.length - 1] : { completed: 0, scope: totalEstimate };
          burndownData.push({ date: label, remaining: lastBurndown, ideal });
          burnupData.push({ date: label, completed: lastBurnup.completed, scope: lastBurnup.scope });
        } else {
          // Future date — only ideal line
          burndownData.push({ date: label, remaining: undefined as any, ideal });
          burnupData.push({ date: label, completed: undefined as any, scope: undefined as any });
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
