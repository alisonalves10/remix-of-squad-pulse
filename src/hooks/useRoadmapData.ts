import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBusinessUnits() {
  return useQuery({
    queryKey: ["business_units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_units")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useSquadBusinessUnits() {
  return useQuery({
    queryKey: ["squad_business_unit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_business_unit")
        .select("*, squads(name), business_units(name)");
      if (error) throw error;
      return data;
    },
  });
}

export function useRoadmapItems() {
  return useQuery({
    queryKey: ["roadmap_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*, business_units(name), squads(name)")
        .order("priority")
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });
}
