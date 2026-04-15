export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      azure_config: {
        Row: {
          area_paths: string[]
          created_at: string
          id: string
          organization: string
          pat_encrypted: string | null
          project: string
          updated_at: string
        }
        Insert: {
          area_paths?: string[]
          created_at?: string
          id?: string
          organization: string
          pat_encrypted?: string | null
          project: string
          updated_at?: string
        }
        Update: {
          area_paths?: string[]
          created_at?: string
          id?: string
          organization?: string
          pat_encrypted?: string | null
          project?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics_snapshot: {
        Row: {
          bugs_created: number | null
          bugs_resolved: number | null
          calculated_at: string
          completed_hours: number | null
          completed_points: number | null
          id: string
          items_completed: number | null
          items_planned: number | null
          planned_hours: number | null
          planned_points: number | null
          sprint_id: string
          squad_id: string
        }
        Insert: {
          bugs_created?: number | null
          bugs_resolved?: number | null
          calculated_at?: string
          completed_hours?: number | null
          completed_points?: number | null
          id?: string
          items_completed?: number | null
          items_planned?: number | null
          planned_hours?: number | null
          planned_points?: number | null
          sprint_id: string
          squad_id: string
        }
        Update: {
          bugs_created?: number | null
          bugs_resolved?: number | null
          calculated_at?: string
          completed_hours?: number | null
          completed_points?: number | null
          id?: string
          items_completed?: number | null
          items_planned?: number | null
          planned_hours?: number | null
          planned_points?: number | null
          sprint_id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_snapshot_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_snapshot_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_progress_daily: {
        Row: {
          completed_points: number | null
          date: string
          id: string
          remaining_points: number | null
          sprint_id: string
          total_scope_points: number | null
        }
        Insert: {
          completed_points?: number | null
          date: string
          id?: string
          remaining_points?: number | null
          sprint_id: string
          total_scope_points?: number | null
        }
        Update: {
          completed_points?: number | null
          date?: string
          id?: string
          remaining_points?: number | null
          sprint_id?: string
          total_scope_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_progress_daily_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          azure_iteration_path: string | null
          created_at: string
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          squad_id: string
          start_date: string
        }
        Insert: {
          azure_iteration_path?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          squad_id: string
          start_date: string
        }
        Update: {
          azure_iteration_path?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          squad_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          azure_team_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          azure_team_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          azure_team_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          azure_devops_unique_name: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string | null
          squad_id: string | null
        }
        Insert: {
          azure_devops_unique_name?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string | null
          squad_id?: string | null
        }
        Update: {
          azure_devops_unique_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string | null
          squad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_squad"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          area_path: string | null
          assigned_to_user_id: string | null
          completed_at: string | null
          completed_work: number | null
          created_at: string
          id: number
          is_spillover: boolean | null
          original_estimate: number | null
          parent_id: number | null
          pk: string
          remaining_work: number | null
          sprint_id: string
          squad_id: string
          state: string
          story_points: number | null
          title: string
          type: string
        }
        Insert: {
          area_path?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completed_work?: number | null
          created_at?: string
          id: number
          is_spillover?: boolean | null
          original_estimate?: number | null
          parent_id?: number | null
          pk?: string
          remaining_work?: number | null
          sprint_id: string
          squad_id: string
          state: string
          story_points?: number | null
          title: string
          type: string
        }
        Update: {
          area_path?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completed_work?: number | null
          created_at?: string
          id?: number
          is_spillover?: boolean | null
          original_estimate?: number | null
          parent_id?: number | null
          pk?: string
          remaining_work?: number | null
          sprint_id?: string
          squad_id?: string
          state?: string
          story_points?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
