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
      // Fetch all squads and sprints
      const [squadsRes, sprintsRes] = await Promise.all([
        supabase.from("squads").select("id, name").order("name"),
        supabase.from("sprints").select("*, squads(name)").order("start_date", { ascending: false }),
      ]);

      if (squadsRes.error) throw squadsRes.error;
      if (sprintsRes.error) throw sprintsRes.error;

      const squadsData = squadsRes.data || [];
      const sprints = sprintsRes.data || [];
      if (!sprints || sprints.length === 0) return null;

      const sprint = sprintId
        ? sprints.find((s) => s.id === sprintId) || sprints[0]
        : (() => {
            const backoffice = squadsData.find(s => s.name.toLowerCase() === "backoffice");
            const squadId = backoffice?.id || squadsData[0]?.id;
            const squadSprints = sprints.filter(s => s.squad_id === squadId);
            const todayStr = formatDateKey(new Date());
            const current = squadSprints.find(s => !s.is_closed && s.start_date <= todayStr && s.end_date >= todayStr);
            return current || squadSprints[0] || sprints[0];
          })();

      // Fetch work items and metrics for the selected sprint
      const [workItemsRes, metricsRes, progressRes, usersRes] = await Promise.all([
        supabase
          .from("work_items")
          .select("id, type, title, state, story_points, original_estimate, remaining_work, completed_work, is_spillover, assigned_to_user_id, created_at, completed_at, parent_id")
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
        crossSprint: false,
        crossSprintName: null as string | null,
      }));
      const metrics = metricsRes.data;
      const progressDaily = progressRes.data || [];

      // --- Cross-sprint: fetch related parent/child items from other sprints ---
      const currentItemIds = new Set(workItems.map((wi) => wi.id));
      const missingParentIds = workItems
        .filter((wi) => wi.parent_id && !currentItemIds.has(wi.parent_id))
        .map((wi) => wi.parent_id!);
      const managementTypeItems = workItems.filter((wi) => ["Epic", "Feature", "User Story"].includes(wi.type));
      const managementIds = managementTypeItems.map((wi) => wi.id);

      let crossSprintItems: typeof workItems = [];

      if (missingParentIds.length > 0 || managementIds.length > 0) {
        const [parentsRes, childrenRes] = await Promise.all([
          missingParentIds.length > 0
            ? supabase
                .from("work_items")
                .select("id, type, title, state, story_points, original_estimate, remaining_work, completed_work, is_spillover, assigned_to_user_id, created_at, completed_at, parent_id, sprint_id")
                .in("id", [...new Set(missingParentIds)])
                .neq("sprint_id", sprint.id)
            : Promise.resolve({ data: [] as any[], error: null }),
          managementIds.length > 0
            ? supabase
                .from("work_items")
                .select("id, type, title, state, story_points, original_estimate, remaining_work, completed_work, is_spillover, assigned_to_user_id, created_at, completed_at, parent_id, sprint_id")
                .in("parent_id", managementIds)
                .neq("sprint_id", sprint.id)
                .eq("squad_id", sprint.squad_id)
            : Promise.resolve({ data: [] as any[], error: null }),
        ]);

        const sprintNameMap = new Map<string, string>();
        sprints.forEach((s) => sprintNameMap.set(s.id, s.name));

        const mergedCross = new Map<number, typeof workItems[0]>();
        [...(parentsRes.data || []), ...(childrenRes.data || [])].forEach((wi: any) => {
          if (!currentItemIds.has(wi.id) && !mergedCross.has(wi.id)) {
            mergedCross.set(wi.id, {
              ...wi,
              assigned_to_name: wi.assigned_to_user_id ? usersMap.get(wi.assigned_to_user_id) || "—" : "—",
              crossSprint: true,
              crossSprintName: sprintNameMap.get(wi.sprint_id) || null,
            });
          }
        });
        crossSprintItems = Array.from(mergedCross.values());
      }

      const allItemsForHierarchy = [...workItems, ...crossSprintItems];

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
        const dateKey = formatDateKey(d);

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

      // Get unique types and states for filters (only operational types for the work items table)
      const operationalTypes = ["Task", "Bug", "Issue", "Speed"];
      const operationalItems = workItems.filter((wi) => operationalTypes.includes(wi.type));
      const types = [...new Set(operationalItems.map((wi) => wi.type))].sort();
      const states = [...new Set(operationalItems.map((wi) => wi.state))].sort();

      // Build work item lookup map by id (including cross-sprint items)
      const wiMap = new Map<number, typeof workItems[0]>();
      workItems.forEach((wi) => wiMap.set(wi.id, wi));
      crossSprintItems.forEach((wi) => wiMap.set(wi.id, wi));

      // Build parent name lookup for operational items
      const operationalItemsWithParent = operationalItems.map((wi) => ({
        ...wi,
        parent_title: wi.parent_id ? wiMap.get(wi.parent_id)?.title || null : null,
        parent_type: wi.parent_id ? wiMap.get(wi.parent_id)?.type || null : null,
      }));

      // Build hierarchy tree for management view (Epic → Feature → User Story)
      const managementTypes2 = ["Epic", "Feature", "User Story"];
      const managementItems = allItemsForHierarchy.filter((wi) => managementTypes2.includes(wi.type));

      // Build tree: Epic → Features → User Stories
      type HierarchyNode = {
        item: typeof workItems[0];
        children: HierarchyNode[];
      };

      const epicNodes: HierarchyNode[] = [];
      const orphanFeatures: HierarchyNode[] = [];
      const orphanStories: HierarchyNode[] = [];

      const epics = managementItems.filter((wi) => wi.type === "Epic");
      const features = managementItems.filter((wi) => wi.type === "Feature");
      const stories = managementItems.filter((wi) => wi.type === "User Story");

      // Map features by parent_id (Epic)
      const featuresByParent = new Map<number, typeof features>();
      features.forEach((f) => {
        const pid = f.parent_id;
        if (pid) {
          if (!featuresByParent.has(pid)) featuresByParent.set(pid, []);
          featuresByParent.get(pid)!.push(f);
        }
      });

      // Map stories by parent_id (Feature or Epic)
      const storiesByParent = new Map<number, typeof stories>();
      stories.forEach((s) => {
        const pid = s.parent_id;
        if (pid) {
          if (!storiesByParent.has(pid)) storiesByParent.set(pid, []);
          storiesByParent.get(pid)!.push(s);
        }
      });

      // Build epic trees
      epics.forEach((epic) => {
        const epicFeatures = featuresByParent.get(epic.id) || [];
        const featureNodes: HierarchyNode[] = epicFeatures.map((f) => ({
          item: f,
          children: (storiesByParent.get(f.id) || []).map((s) => ({ item: s, children: [] })),
        }));
        // Also attach stories directly under epic (no feature in between)
        const directStories = (storiesByParent.get(epic.id) || []).map((s) => ({ item: s, children: [] }));
        epicNodes.push({ item: epic, children: [...featureNodes, ...directStories] });
      });

      // Orphan features (no parent epic in sprint)
      features.filter((f) => !f.parent_id || !epics.some((e) => e.id === f.parent_id)).forEach((f) => {
        orphanFeatures.push({
          item: f,
          children: (storiesByParent.get(f.id) || []).map((s) => ({ item: s, children: [] })),
        });
      });

      // Orphan stories (no parent feature/epic in sprint)
      const allParentIds = new Set([...epics.map((e) => e.id), ...features.map((f) => f.id)]);
      stories.filter((s) => !s.parent_id || !allParentIds.has(s.parent_id)).forEach((s) => {
        orphanStories.push({ item: s, children: [] });
      });

      const hierarchyTree = [...epicNodes, ...orphanFeatures, ...orphanStories];

      // Group sprints by squad_id
      const sprintsBySquad: Record<string, Array<{ id: string; name: string; squad_id: string; start_date: string; end_date: string; is_closed: boolean | null }>> = {};
      sprints.forEach((s) => {
        if (!sprintsBySquad[s.squad_id]) sprintsBySquad[s.squad_id] = [];
        sprintsBySquad[s.squad_id].push({ id: s.id, name: s.name, squad_id: s.squad_id, start_date: s.start_date, end_date: s.end_date, is_closed: s.is_closed });
      });

      return {
        sprint: {
          ...sprint,
          squadName: (sprint as any).squads?.name || "—",
        },
        squads: squadsData,
        sprintsBySquad,
        allSprints: sprints.map((s) => ({
          id: s.id,
          name: s.name,
          squad_id: s.squad_id,
          squadName: (s as any).squads?.name || "—",
        })),
        workItems: operationalItemsWithParent,
        hierarchyTree,
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
