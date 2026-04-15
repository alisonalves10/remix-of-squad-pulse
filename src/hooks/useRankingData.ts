import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSprintFuture } from "@/lib/sprint-utils";

export interface RankingEntry {
  userId: string;
  userName: string;
  userRole: string | null;
  totalHours: number;
  completedItems: number;
  totalItems: number;
  bugsResolved: number;
  sprintCount: number;
}

export function useRankingData(squadFilter: string, sprintFilter: string) {
  return useQuery({
    queryKey: ["ranking-data", squadFilter, sprintFilter],
    queryFn: async () => {
      // Fetch users, sprints, work items in parallel
      const [usersRes, sprintsRes, workItemsRes] = await Promise.all([
        supabase.from("users").select("id, name, role, squad_id").order("name"),
        supabase.from("sprints").select("id, name, start_date, end_date, squad_id").order("start_date", { ascending: false }),
        supabase.from("work_items").select("assigned_to_user_id, completed_work, state, type, sprint_id"),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (sprintsRes.error) throw sprintsRes.error;
      if (workItemsRes.error) throw workItemsRes.error;

      const users = usersRes.data || [];
      const sprints = (sprintsRes.data || []).filter(s => !isSprintFuture(s));
      const workItems = workItemsRes.data || [];

      // Build valid sprint set (non-future, optionally filtered by squad)
      const sprintMap = new Map(sprints.map(s => [s.id, s]));
      const validSprintIds = new Set(
        sprints
          .filter(s => squadFilter === "all" || s.squad_id === squadFilter)
          .filter(s => sprintFilter === "all" || s.id === sprintFilter)
          .map(s => s.id)
      );

      // Aggregate per user
      const userMap = new Map<string, RankingEntry>();
      users.forEach(u => {
        userMap.set(u.id, {
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          totalHours: 0,
          completedItems: 0,
          totalItems: 0,
          bugsResolved: 0,
          sprintCount: 0,
        });
      });

      const userSprints = new Map<string, Set<string>>();

      workItems.forEach(wi => {
        if (!wi.assigned_to_user_id || !validSprintIds.has(wi.sprint_id)) return;
        const entry = userMap.get(wi.assigned_to_user_id);
        if (!entry) return;

        entry.totalItems += 1;
        entry.totalHours += wi.completed_work || 0;

        if (["Done", "Closed"].includes(wi.state)) {
          entry.completedItems += 1;
          if (wi.type === "Bug") entry.bugsResolved += 1;
        }

        if (!userSprints.has(wi.assigned_to_user_id)) {
          userSprints.set(wi.assigned_to_user_id, new Set());
        }
        userSprints.get(wi.assigned_to_user_id)!.add(wi.sprint_id);
      });

      // Set sprint counts and filter out users with no items
      const rankings: RankingEntry[] = [];
      userMap.forEach((entry) => {
        entry.sprintCount = userSprints.get(entry.userId)?.size || 0;
        entry.totalHours = Math.round(entry.totalHours * 100) / 100;
        if (entry.totalItems > 0) rankings.push(entry);
      });

      return rankings;
    },
  });
}
