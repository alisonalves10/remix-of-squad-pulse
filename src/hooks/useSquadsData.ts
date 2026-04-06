import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SquadData {
  id: string;
  name: string;
  description: string | null;
  azure_team_id: string | null;
}

export interface SprintData {
  id: string;
  name: string;
  squad_id: string;
  start_date: string;
  end_date: string;
  is_closed: boolean | null;
  azure_iteration_path: string | null;
}

export interface MetricsData {
  sprint_id: string;
  squad_id: string;
  planned_points: number | null;
  completed_points: number | null;
  bugs_created: number | null;
  bugs_resolved: number | null;
  items_planned: number | null;
  items_completed: number | null;
}

export interface WorkItemData {
  id: number;
  sprint_id: string;
  squad_id: string;
  type: string;
  title: string;
  state: string;
  story_points: number | null;
  completed_at: string | null;
  is_spillover: boolean | null;
}

export function useSquads() {
  return useQuery({
    queryKey: ["squads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("squads").select("*").order("name");
      if (error) throw error;
      return data as SquadData[];
    },
  });
}

export function useSprintsBySquad(squadId: string | undefined) {
  return useQuery({
    queryKey: ["sprints", squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .eq("squad_id", squadId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as SprintData[];
    },
    enabled: !!squadId,
  });
}

export function useMetricsBySquad(squadId: string | undefined) {
  return useQuery({
    queryKey: ["metrics", squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const { data, error } = await supabase
        .from("metrics_snapshot")
        .select("*")
        .eq("squad_id", squadId);
      if (error) throw error;
      return data as MetricsData[];
    },
    enabled: !!squadId,
  });
}

export function useWorkItemsBySquad(squadId: string | undefined) {
  return useQuery({
    queryKey: ["work_items", squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const { data, error } = await supabase
        .from("work_items")
        .select("*")
        .eq("squad_id", squadId)
        .order("id");
      if (error) throw error;
      return data as WorkItemData[];
    },
    enabled: !!squadId,
  });
}
