import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardData(selectedSquadId?: string | null, selectedSprintName?: string | null) {
  return useQuery({
    queryKey: ["dashboard-data", selectedSquadId ?? "all", selectedSprintName ?? "latest"],
    queryFn: async () => {
      const [squadsRes, sprintsRes, metricsRes, workItemsRes] = await Promise.all([
        supabase.from("squads").select("*").order("name"),
        supabase.from("sprints").select("*").order("start_date", { ascending: true }),
        supabase.from("metrics_snapshot").select("*"),
        supabase.from("work_items").select("id, squad_id, sprint_id, is_spillover, story_points, state, type, original_estimate, remaining_work, completed_work"),
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

      // Collect unique sprint names for the filter (sorted by date desc)
      const sprintNamesSet = new Map<string, string>();
      for (const s of [...sprintsRes.data].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())) {
        if (!sprintNamesSet.has(s.name)) {
          sprintNamesSet.set(s.name, s.start_date);
        }
      }
      const allSprintNames = [...sprintNamesSet.keys()];

      const totalSquads = squads.length;

      // Determine the target sprint per squad
      const targetSprintBySquad = new Map<string, string>();
      for (const squad of squads) {
        if (selectedSprintName) {
          // Find the sprint with this name for this squad
          const match = sprints.find(s => s.squad_id === squad.id && s.name === selectedSprintName);
          if (match) targetSprintBySquad.set(squad.id, match.id);
        } else {
          // Use latest finished sprint (end_date < today), fallback to latest
          const today = new Date().toISOString().split("T")[0];
          const finishedSprints = sprints.filter(s => s.squad_id === squad.id && s.end_date < today);
          const fallback = sprints.filter(s => s.squad_id === squad.id);
          const best = finishedSprints.length > 0 ? finishedSprints[finishedSprints.length - 1] : fallback[fallback.length - 1];
          if (best) targetSprintBySquad.set(squad.id, best.id);
        }
      }

      const metricsByKey = new Map<string, typeof metrics[0]>();
      for (const m of metrics) {
        metricsByKey.set(`${m.squad_id}_${m.sprint_id}`, m);
      }

      let totalVelocity = 0;
      let totalCommitment = 0;
      let commitmentCount = 0;
      let globalBugsCreated = 0;
      let globalBugsResolved = 0;
      let globalTotalItems = 0;
      let globalCompletedItems = 0;

      const squadTableData: Array<{
        id: string;
        name: string;
        velocity: number;
        commitment: number;
        spillover: number;
        trend: "up" | "down" | "stable";
        bugsCreated: number;
        bugsResolved: number;
      }> = [];

      const velocityBySquad: Array<{ name: string; velocity: number }> = [];

      for (const squad of squads) {
        const targetSprintId = targetSprintBySquad.get(squad.id);
        const m = targetSprintId ? metricsByKey.get(`${squad.id}_${targetSprintId}`) : undefined;

        const completed = Number((m as any)?.completed_hours ?? 0);
        const planned = Number((m as any)?.planned_hours ?? 0);
        const commitment = planned > 0 ? Math.round((completed / planned) * 100) : 0;

        const squadWorkItems = workItems.filter(
          (wi) => wi.squad_id === squad.id && wi.sprint_id === targetSprintId
        );
        const totalItems = squadWorkItems.length;
        const completedItems = squadWorkItems.filter(wi => ["Done", "Closed"].includes(wi.state)).length;
        const spilloverItems = squadWorkItems.filter((wi) => wi.is_spillover).length;
        const spillover = totalItems > 0 ? Math.round((spilloverItems / totalItems) * 100) : 0;

        const bugsCreated = squadWorkItems.filter(wi => wi.type === "Bug").length;
        const bugsResolved = squadWorkItems.filter(wi => wi.type === "Bug" && ["Done", "Closed"].includes(wi.state)).length;

        totalVelocity += completed;
        if (planned > 0) {
          totalCommitment += commitment;
          commitmentCount++;
        }
        globalBugsCreated += bugsCreated;
        globalBugsResolved += bugsResolved;
        globalTotalItems += totalItems;
        globalCompletedItems += completedItems;

        const squadSprints = sprints.filter((s) => s.squad_id === squad.id);
        let trend: "up" | "down" | "stable" = "stable";
        if (targetSprintId) {
          const targetIdx = squadSprints.findIndex(s => s.id === targetSprintId);
          if (targetIdx > 0) {
            const prev = squadSprints[targetIdx - 1];
            const prevM = metricsByKey.get(`${squad.id}_${prev.id}`);
            const prevCompleted = Number((prevM as any)?.completed_hours ?? 0);
            if (completed > prevCompleted) trend = "up";
            else if (completed < prevCompleted) trend = "down";
          }
        }

        squadTableData.push({
          id: squad.id,
          name: squad.name,
          velocity: completed,
          commitment,
          spillover,
          trend,
          bugsCreated,
          bugsResolved,
        });

        velocityBySquad.push({ name: squad.name, velocity: completed });
      }

      const avgVelocity = totalSquads > 0 ? Math.round(totalVelocity / totalSquads) : 0;
      const avgCommitment = commitmentCount > 0 ? Math.round(totalCommitment / commitmentCount) : 0;

      // Spillover only from target sprints
      const targetSprintIds = new Set(targetSprintBySquad.values());
      const targetWorkItems = workItems.filter(wi => targetSprintIds.has(wi.sprint_id));
      const allSpillover = targetWorkItems.filter((wi) => wi.is_spillover).length;
      const avgSpillover = targetWorkItems.length > 0 ? Math.round((allSpillover / targetWorkItems.length) * 100) : 0;

      const bugResolutionRate =
        globalBugsCreated > 0
          ? Math.round((globalBugsResolved / globalBugsCreated) * 100)
          : 0;

      const completionRate = globalTotalItems > 0
        ? Math.round((globalCompletedItems / globalTotalItems) * 100)
        : 0;

      const sprintOrder = [...new Map(sprints.map((s) => [s.name, s])).values()];
      const velocityTrend = sprintOrder.map((sprint) => {
        const sprintMetrics = metrics.filter((m) => m.sprint_id === sprint.id);
        const vel = sprintMetrics.reduce((sum, m) => sum + Number((m as any).completed_hours ?? 0), 0);
        const comm = sprintMetrics.reduce((sum, m) => sum + Number((m as any).planned_hours ?? 0), 0);
        return { name: sprint.name, velocity: vel, commitment: comm };
      });

      return {
        totalSquads,
        avgVelocity,
        avgCommitment,
        avgSpillover,
        globalBugsCreated,
        globalBugsResolved,
        bugResolutionRate,
        completionRate,
        velocityBySquad,
        velocityTrend,
        squadTableData,
        allSquads,
        allSprintNames,
      };
    },
  });
}
