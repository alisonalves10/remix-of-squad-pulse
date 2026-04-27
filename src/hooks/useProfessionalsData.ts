import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSprintFuture } from "@/lib/sprint-utils";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string | null;
  squad_id: string | null;
}

export interface ProfessionalWorkItem {
  pk: string;
  id: number;
  title: string;
  type: string;
  state: string;
  completed_work: number | null;
  original_estimate: number | null;
  remaining_work: number | null;
  area_path: string | null;
  sprint_id: string;
  sprint_name: string;
  sprint_start_date: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, squad_id")
        .order("name");
      if (error) throw error;
      return data as UserData[];
    },
  });
}

export function useNonFutureSprints() {
  return useQuery({
    queryKey: ["sprints-non-future"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sprints")
        .select("id, name, start_date, end_date, squad_id")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []).filter(s => !isSprintFuture(s));
    },
  });
}

export function useWorkItemsByUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["work-items-by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("pk, id, title, type, state, completed_work, original_estimate, remaining_work, area_path, sprint_id")
        .eq("assigned_to_user_id", userId!)
        .order("id", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
