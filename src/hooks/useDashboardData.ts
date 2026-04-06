import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardData(selectedSquadId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-data", selectedSquadId ?? "all"],
    queryFn: async () => {
      const [squadsRes, sprintsRes, metricsRes, workItemsRes] = await Promise.all([
        supabase.from("squads").select("*").order("name"),
        supabase.from("sprints").select("*").order("start_date", { ascending: true }),
        supabase.from("metrics_snapshot").select("*"),
        supabase.from("work_items").select("id, squad_id, sprint_id, is_spillover, story_points, state, type"),
      ]);

      if (squadsRes.error) throw squadsRes.error;
      if (sprintsRes.error) throw sprintsRes.error;
      if (metricsRes.error) throw metricsRes.error;
      if (workItemsRes.error) throw workItemsRes.error;

      const allSquads = squadsRes.data;
      const squads = selectedSquadId ? allSquads.filter(s => s.id === selectedSquadId) : allSquads;
      const sprints = sprintsRes.data.filter(s => !selectedSquadId || s.squad_id === selectedSquadId);
      const metrics = metricsRes.data.filter(m => !selectedSquadId || m.squad_id === selectedSquadId);
      const workItems = workItemsRes.data.filter(wi => !selectedSquadId || wi.squad_id === selectedSquadId);

      const totalSquads = squads.length;

      const latestSprintBySquad = new Map<string, string>();
      for (const sprint of sprints) {
        latestSprintBySquad.set(sprint.squad_id, sprint.id);
      }

      const metricsByKey = new Map<string, typeof metrics[0]>();
      for (const m of metrics) {
        metricsByKey.set(`${m.squad_id}_${m.sprint_id}`, m);
      }

      let totalVelocity = 0;
      let totalCommitment = 0;
      let commitmentCount = 0;
      let totalBugsCreated = 0;
      let totalBugsResolved = 0;

      const squadTableData: Array<{
        id: string;
        name: string;
        velocity: number;
        commitment: number;
        spillover: number;
        trend: "up" | "down" | "stable";
      }> = [];

      const velocityBySquad: Array<{ name: string; velocity: number }> = [];

      for (const squad of squads) {
        const latestSprintId = latestSprintBySquad.get(squad.id);
        const m = latestSprintId ? metricsByKey.get(`${squad.id}_${latestSprintId}`) : undefined;

        const completed = Number(m?.completed_points ?? 0);
        const planned = Number(m?.planned_points ?? 0);
        const commitment = planned > 0 ? Math.round((completed / planned) * 100) : 0;

        const squadWorkItems = workItems.filter(
          (wi) => wi.squad_id === squad.id && wi.sprint_id === latestSprintId
        );
        const totalItems = squadWorkItems.length;
        const spilloverItems = squadWorkItems.filter((wi) => wi.is_spillover).length;
        const spillover = totalItems > 0 ? Math.round((spilloverItems / totalItems) * 100) : 0;

        totalVelocity += completed;
        if (planned > 0) {
          totalCommitment += commitment;
          commitmentCount++;
        }
        totalBugsCreated += Number(m?.bugs_created ?? 0);
        totalBugsResolved += Number(m?.bugs_resolved ?? 0);

        const squadSprints = sprints.filter((s) => s.squad_id === squad.id);
        let trend: "up" | "down" | "stable" = "stable";
        if (squadSprints.length >= 2) {
          const prev = squadSprints[squadSprints.length - 2];
          const prevM = metricsByKey.get(`${squad.id}_${prev.id}`);
          const prevCompleted = Number(prevM?.completed_points ?? 0);
          if (completed > prevCompleted) trend = "up";
          else if (completed < prevCompleted) trend = "down";
        }

        squadTableData.push({
          id: squad.id,
          name: squad.name,
          velocity: completed,
          commitment,
          spillover,
          trend,
        });

        velocityBySquad.push({ name: squad.name, velocity: completed });
      }

      const avgVelocity = totalSquads > 0 ? Math.round(totalVelocity / totalSquads) : 0;
      const avgCommitment = commitmentCount > 0 ? Math.round(totalCommitment / commitmentCount) : 0;

      const allSpillover = workItems.filter((wi) => wi.is_spillover).length;
      const avgSpillover = workItems.length > 0 ? Math.round((allSpillover / workItems.length) * 100) : 0;

      const bugRate =
        totalBugsCreated + totalBugsResolved > 0
          ? Math.round((totalBugsCreated / (totalBugsCreated + totalBugsResolved)) * 100)
          : 0;

      const sprintOrder = [...new Map(sprints.map((s) => [s.name, s])).values()];
      const velocityTrend = sprintOrder.map((sprint) => {
        const sprintMetrics = metrics.filter((m) => m.sprint_id === sprint.id);
        const vel = sprintMetrics.reduce((sum, m) => sum + Number(m.completed_points ?? 0), 0);
        const comm = sprintMetrics.reduce((sum, m) => sum + Number(m.planned_points ?? 0), 0);
        return { name: sprint.name, velocity: vel, commitment: comm };
      });

      return {
        totalSquads,
        avgVelocity,
        avgCommitment,
        avgSpillover,
        bugRate,
        velocityBySquad,
        velocityTrend,
        squadTableData,
        allSquads,
      };
    },
  });
}
